import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { demoProjects, demoFileTree, DEMO_HERO_FILE } from '@/services/mock/demoData';
import type { DemoFileNode } from '@/services/mock/demoData';
import { Code, FolderOpen, FileText, ChevronRight, ChevronDown, X, Plus, Save, RotateCcw, AlertTriangle } from 'lucide-react';

function findFile(node: DemoFileNode, targetId: string): DemoFileNode | null {
  if (node.id === targetId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findFile(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

function FileTreeNode({ node, activeTab, onSelect, depth = 0 }: { node: DemoFileNode; activeTab: string | null; onSelect: (n: DemoFileNode) => void; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isFolder = node.type === 'folder';
  const isActive = activeTab === node.id;
  const isEmpty = isFolder && (!node.children || node.children.length === 0);

  return (
    <div>
      <button
        onClick={() => {
          if (isFolder) setExpanded(!expanded);
          else onSelect(node);
        }}
        className={`flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-xs transition-colors ${
          isActive ? 'bg-amber-500/10 text-amber-600' : 'text-foreground-600 hover:bg-background-100'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isFolder ? (
          <>
            {isEmpty ? <span className="w-3" /> : expanded ? <ChevronDown className="h-3 w-3 flex-shrink-0 text-foreground-400" /> : <ChevronRight className="h-3 w-3 flex-shrink-0 text-foreground-400" />}
            <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          </>
        ) : (
          <>
            <span className="w-3" />
            <FileText className="h-3.5 w-3.5 flex-shrink-0 text-foreground-400" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && expanded && node.children?.map((child) => (
        <FileTreeNode key={child.id} node={child} activeTab={activeTab} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function FilesPage() {
  const { projectId } = useParams();
  const project = demoProjects.find((p) => p.id === projectId);

  const [openTabs, setOpenTabs] = useState<DemoFileNode[]>(() => {
    const heroFile = findFile(demoFileTree, 'f-hero');
    return heroFile ? [heroFile] : [];
  });
  const [activeTab, setActiveTab] = useState<string | null>('f-hero');
  const [fileContents, setFileContents] = useState<Record<string, string>>({
    'f-hero': DEMO_HERO_FILE,
  });
  const [savedStatus, setSavedStatus] = useState<Record<string, 'saved' | 'modified' | 'saving'>>({
    'f-hero': 'saved',
  });
  const [showConflict, setShowConflict] = useState(false);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-foreground-300 mb-3" />
        <p className="text-sm font-medium text-foreground-950">Project not found</p>
        <Link to="/projects" className="mt-4"><Button variant="ghost" size="sm">Back to Projects</Button></Link>
      </div>
    );
  }

  const activeFile = openTabs.find((t) => t.id === activeTab);
  const activeContent = activeTab ? fileContents[activeTab] || '// File is empty' : null;

  const handleSelectFile = (node: DemoFileNode) => {
    if (node.type === 'folder') return;
    if (!openTabs.find((t) => t.id === node.id)) {
      setOpenTabs([...openTabs, node]);
      if (!fileContents[node.id]) {
        setFileContents({ ...fileContents, [node.id]: '// File content loading...' });
        setSavedStatus({ ...savedStatus, [node.id]: 'saved' });
      }
    }
    setActiveTab(node.id);
  };

  const handleCloseTab = (tabId: string) => {
    const newTabs = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(newTabs);
    if (activeTab === tabId) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
  };

  const handleContentChange = (content: string) => {
    if (!activeTab) return;
    setFileContents({ ...fileContents, [activeTab]: content });
    setSavedStatus({ ...savedStatus, [activeTab]: 'modified' });
  };

  const handleSave = () => {
    if (!activeTab) return;
    setSavedStatus({ ...savedStatus, [activeTab]: 'saving' });
    setTimeout(() => {
      setSavedStatus({ ...savedStatus, [activeTab]: 'saved' });
    }, 600);
  };

  const contentLines = activeContent ? activeContent.split('\n') : [];

  return (
    <>
      <PageHeader
        title="Files"
        description={`${project.stats.fileCount} files in ${project.name}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.name, href: `/projects/${project.id}/overview` },
          { label: 'Files' },
        ]}
      />

      <div className="flex gap-0 border border-background-200 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 16rem)' }}>
        {/* File tree */}
        <div className="w-56 flex-shrink-0 border-r border-background-200 bg-background-50 overflow-y-auto">
          <div className="px-3 py-2 border-b border-background-200">
            <p className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">Explorer</p>
          </div>
          <div className="py-1">
            <FileTreeNode node={demoFileTree} activeTab={activeTab} onSelect={handleSelectFile} />
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="flex items-center border-b border-background-200 bg-background-50 overflow-x-auto">
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-background-200 cursor-pointer transition-colors flex-shrink-0 ${
                  activeTab === tab.id ? 'bg-white text-foreground-950' : 'text-foreground-500 hover:bg-background-100'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <FileText className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{tab.name}</span>
                {savedStatus[tab.id] === 'modified' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                {savedStatus[tab.id] === 'saving' && <span className="text-xs text-foreground-400 animate-pulse">...</span>}
                <button
                  onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
                  className="ml-1 p-0.5 rounded hover:bg-background-200 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Editor header bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-background-100 bg-white">
            <div className="flex items-center gap-2">
              {activeFile && (
                <span className="text-xs text-foreground-500 font-mono">{activeFile.path}</span>
              )}
              {activeTab && savedStatus[activeTab] === 'modified' && (
                <Badge size="sm" variant="warning">Unsaved</Badge>
              )}
              {activeTab && savedStatus[activeTab] === 'saved' && (
                <span className="text-xs text-emerald-500">Saved</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowConflict(true)}>
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button size="sm" className="text-xs" onClick={handleSave} icon={<Save className="h-3 w-3" />}>
                Save
              </Button>
            </div>
          </div>

          {/* Code editor */}
          <div className="flex-1 overflow-auto bg-white">
            {activeContent ? (
              <div className="flex">
                {/* Line numbers */}
                <div className="flex-shrink-0 py-2 select-none text-right pr-3 pl-2 bg-background-50 border-r border-background-100">
                  {contentLines.map((_, i) => (
                    <div key={i} className="text-xs text-foreground-300 font-mono leading-5 h-5">
                      {i + 1}
                    </div>
                  ))}
                </div>
                {/* Code */}
                <div className="flex-1 min-w-0">
                  <textarea
                    value={activeContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full h-full min-h-[400px] p-2 text-xs font-mono text-foreground-950 bg-transparent resize-none focus:outline-none leading-5"
                    spellCheck={false}
                    style={{ tabSize: 2 }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Code className="h-8 w-8 text-foreground-300 mb-2" />
                <p className="text-xs text-foreground-500">Select a file from the explorer to edit</p>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1 border-t border-background-200 bg-background-50 text-xs text-foreground-400">
            <div className="flex items-center gap-3">
              {activeFile && <span>{activeFile.name}</span>}
              <span>{contentLines.length} lines</span>
              <span>UTF-8</span>
            </div>
            <div className="flex items-center gap-3">
              <span>TypeScript React</span>
              <span>Ln {contentLines.length}, Col 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict modal */}
      {showConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowConflict(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
            <h3 className="text-sm font-semibold text-foreground-950 mb-2">File Conflict Detected</h3>
            <p className="text-xs text-foreground-500 mb-4">
              Another agent or user has modified this file. Would you like to keep your changes or revert to the latest version?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowConflict(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => setShowConflict(false)}>Revert</Button>
              <Button size="sm" onClick={() => setShowConflict(false)}>Keep Mine</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}