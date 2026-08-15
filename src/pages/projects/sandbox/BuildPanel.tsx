import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, FileArchive, Info, Loader2, X } from 'lucide-react';
import type { SandboxDocument } from './sandboxPersistence';
import { hasBlockers, type ValidationResult } from './sandboxValidation';
import { formatBytes } from './sandboxAssets';
import {
  buildWorkerAvailable, downloadBlob, exportStaticSiteZip, recordLocalExport,
  type ExportProgress, type ExportResult,
} from './sandboxBuilds';

export type BuildStage = 'idle' | 'validating' | 'checkpoint' | 'generating' | 'packaging' | 'done' | 'failed';

export type BuildPanelProps = {
  document: SandboxDocument;
  validation: ValidationResult;
  sourceVersionNumber: number | null;
  onClose: () => void;
  onNotify: (message: string) => void;
  onCreateCheckpoint: () => Promise<{ ok: boolean; message?: string }>;
};

const STAGE_LABELS: Record<BuildStage, string> = {
  idle: 'Ready', validating: 'Validating', checkpoint: 'Creating checkpoint', generating: 'Generating', packaging: 'Packaging', done: 'Completed', failed: 'Failed',
};

export default function BuildPanel({ document, validation, sourceVersionNumber, onClose, onNotify, onCreateCheckpoint }: BuildPanelProps) {
  const [stage, setStage] = useState<BuildStage>('idle');
  const [progress, setProgress] = useState<ExportProgress>({ stage: 'generating', pagesProcessed: 0, totalPages: 0, assetsProcessed: 0, totalAssets: 0 });
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  const workerAvailable = useMemo(() => buildWorkerAvailable(), []);
  const busy = stage !== 'idle' && stage !== 'done' && stage !== 'failed';

  const pushLog = (message: string) => setLogs((current) => [...current, message]);

  const startBuild = async () => {
    if (busy) return;
    setStage('validating');
    setError(null);
    setResult(null);
    setLogs([]);
    const start = Date.now();

    pushLog('Validating blueprint…');
    if (hasBlockers(validation)) {
      pushLog(`Validation failed with ${validation.blockers} blocker(s).`);
      setError('Resolve all blockers before building.');
      setStage('failed');
      setDurationMs(Date.now() - start);
      return;
    }

    setStage('checkpoint');
    pushLog('Creating a safety checkpoint…');
    const checkpoint = await onCreateCheckpoint();
    if (!checkpoint.ok) {
      pushLog(checkpoint.message ?? 'Checkpoint creation failed.');
      setError('Could not create the build checkpoint.');
      setStage('failed');
      setDurationMs(Date.now() - start);
      return;
    }

    setStage('generating');
    if (!workerAvailable) {
      pushLog('Build worker not configured — using local browser export.');
    }
    pushLog('Generating static site files…');

    try {
      const exported = await exportStaticSiteZip(document, { siteUrl: '', includeAssets: true }, (prog) => {
        setProgress(prog);
        if (prog.stage === 'packaging') setStage('packaging');
      });

      pushLog(`Packaged ${exported.sizeBytes} bytes across ${document.pages.length} page(s).`);
      if (exported.warnings.length) {
        exported.warnings.forEach((warning) => pushLog(`Warning: ${warning}`));
      }

      setResult(exported);
      setStage('done');
      setDurationMs(Date.now() - start);
      void recordLocalExport(document, exported).then((record) => {
        if (record) pushLog('Export recorded to the project.');
      });
    } catch (err) {
      pushLog(`Build failed: ${(err as Error).message ?? 'Unknown error'}`);
      setError((err as Error).message ?? 'Build failed');
      setStage('failed');
      setDurationMs(Date.now() - start);
    }
  };

  const download = () => {
    if (!result) return;
    downloadBlob(result.blob, result.filename);
    onNotify('Static site download started');
  };

  const copyChecksum = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.checksum);
      onNotify('Checksum copied');
    } catch {
      onNotify(result.checksum);
    }
  };

  const percent = progress.totalPages ? Math.round((progress.pagesProcessed / progress.totalPages) * 100) : 0;

  return (
    <div className="build-panel">
      <div className="build-panel-head">
        <div className="build-panel-title"><FileArchive size={16} />Build <span className="build-stage-chip">{STAGE_LABELS[stage]}</span></div>
        <button onClick={onClose} aria-label="Close build panel"><X size={16} /></button>
      </div>

      {!workerAvailable && stage !== 'done' && (
        <div className="build-worker-note"><Info size={14} /> Build worker not configured — Forge uses a local browser export. Preview, validation and download still work.</div>
      )}

      <div className="build-panel-body">
        {stage === 'idle' && (
          <div className="build-idle">
            <p>Build the current site into a portable static archive.</p>
            <ul>
              <li>Source version: <b>{sourceVersionNumber ? `v${sourceVersionNumber}` : 'unsaved'}</b></li>
              <li>Pages: <b>{document.pages.length}</b></li>
              <li>Validation: <b>{validation.blockers ? `${validation.blockers} blocker(s)` : validation.errors ? `${validation.errors} error(s)` : 'ready'}</b></li>
            </ul>
            <button className="build-start" onClick={() => void startBuild()} disabled={busy}>Start build</button>
          </div>
        )}

        {busy && (
          <div className="build-progress">
            <div className="build-spinner"><Loader2 className="spin" size={18} /> {STAGE_LABELS[stage]}…</div>
            <div className="build-progress-bar"><div style={{ width: `${percent}%` }} /></div>
            <div className="build-progress-meta">
              <span>Pages: {progress.pagesProcessed}/{progress.totalPages}</span>
              <span>Assets: {progress.assetsProcessed}/{progress.totalAssets}</span>
            </div>
          </div>
        )}

        {stage === 'failed' && (
          <div className="build-error"><AlertTriangle size={16} /> {error}</div>
        )}

        {stage === 'done' && result && (
          <div className="build-result">
            <div className="build-result-success"><Check size={16} /> Build completed</div>
            <dl>
              <div><dt>File</dt><dd>{result.filename}</dd></div>
              <div><dt>Size</dt><dd>{formatBytes(result.sizeBytes)}</dd></div>
              <div><dt>Checksum</dt><dd className="build-checksum">{result.checksum.slice(0, 16)}…<button onClick={() => void copyChecksum()} title="Copy checksum" aria-label="Copy checksum"><Copy size={12} /></button></dd></div>
              <div><dt>Duration</dt><dd>{durationMs != null ? `${(durationMs / 1000).toFixed(1)}s` : '—'}</dd></div>
            </dl>
            <div className="build-result-actions">
              <button className="primary" onClick={download}><Download size={15} /> Download ZIP</button>
              <button onClick={() => setStage('idle')}>Build again</button>
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="build-logs">
            <div className="build-logs-title">Logs</div>
            {logs.map((log, index) => <div key={index} className="build-log-line">{log}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}