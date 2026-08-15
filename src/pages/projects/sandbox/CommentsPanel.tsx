import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MessageSquare, RefreshCw, Send, X, CornerDownRight, CheckCircle2,
  Circle, Reply, Filter, MapPin,
} from 'lucide-react';
import {
  listComments, addComment, setCommentStatus,
  type CommentRecord,
} from './sandboxCollaboration';

type CommentsPanelProps = {
  pageId: string;
  pageName: string;
  onFocusComment: (pageId: string | null, elementId: string | null) => void;
  onNotify: (message: string) => void;
};

type FilterState = 'open' | 'resolved' | 'all';

export default function CommentsPanel({ pageId, pageName, onFocusComment, onNotify }: CommentsPanelProps) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>('open');
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setComments(await listComments());
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    if (filter === 'all') return comments;
    return comments.filter((c) => c.status === filter);
  }, [comments, filter]);

  const submit = async () => {
    const body = draft.trim();
    if (!body) return onNotify('Write a comment first');
    setBusy(true);
    const result = await addComment({ body, pageId, elementId: null });
    setBusy(false);
    onNotify(result.message);
    setDraft('');
    void refresh();
  };

  const reply = async (parentId: string) => {
    const body = replyText.trim();
    if (!body) return onNotify('Write a reply first');
    setBusy(true);
    const result = await addComment({ body, pageId, parentCommentId: parentId });
    setBusy(false);
    onNotify(result.message);
    setReplyTo(null);
    setReplyText('');
    void refresh();
  };

  const toggleResolve = async (comment: CommentRecord) => {
    const next = comment.status === 'open' ? 'resolved' : 'open';
    const result = await setCommentStatus(comment.id, next);
    onNotify(result.message);
    void refresh();
  };

  return (
    <div className="comments-panel">
      <div className="comments-toolbar">
        <div className="comments-filter">
          {(['open', 'resolved', 'all'] as FilterState[]).map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              <Filter size={11} /> {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="comments-refresh" onClick={() => void refresh()} title="Refresh"><RefreshCw size={13} /></button>
      </div>

      <div className="comments-page-label"><MapPin size={11} /> {pageName}</div>

      {loading ? (
        <div className="team-empty"><RefreshCw className="spin" size={18} /><p>Loading comments…</p></div>
      ) : filtered.length === 0 ? (
        <div className="team-empty"><MessageSquare size={20} /><p>No {filter} comments yet.</p></div>
      ) : (
        <div className="comments-list">
          {filtered.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replyTo={replyTo}
              replyText={replyText}
              setReplyTo={setReplyTo}
              setReplyText={setReplyText}
              onReply={(id) => void reply(id)}
              onResolve={() => void toggleResolve(comment)}
              onFocus={onFocusComment}
              busy={busy}
            />
          ))}
        </div>
      )}

      <div className="comments-compose">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Comment on “${pageName}”… use @ to mention a teammate`}
        />
        <button className="comments-send" onClick={() => void submit()} disabled={busy || !draft.trim()}>
          <Send size={14} /> Add comment
        </button>
      </div>
    </div>
  );
}

function CommentThread({ comment, replyTo, replyText, setReplyTo, setReplyText, onReply, onResolve, onFocus, busy }: {
  comment: CommentRecord;
  replyTo: string | null;
  replyText: string;
  setReplyTo: (id: string | null) => void;
  setReplyText: (text: string) => void;
  onReply: (id: string) => void;
  onResolve: () => void;
  onFocus: (pageId: string | null, elementId: string | null) => void;
  busy: boolean;
}) {
  const replies = comment.replies ?? [];
  const resolved = comment.status === 'resolved';

  return (
    <div className={`comment-thread ${resolved ? 'resolved' : ''}`}>
      <div className="comment-card">
        <span className="team-avatar small">{comment.authorInitials || 'U'}</span>
        <div className="comment-main">
          <div className="comment-meta">
            <b>{comment.authorName || 'Member'}</b>
            <span>{new Date(comment.createdAt).toLocaleString()}</span>
          </div>
          <p className="comment-body">{renderBody(comment.body)}</p>
          {comment.elementId && (
            <button className="comment-anchor" onClick={() => onFocus(comment.pageId, comment.elementId)}>
              <MapPin size={10} /> {comment.elementId ? 'Attached to element' : 'Page comment'}
            </button>
          )}
          <div className="comment-actions">
            <button onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyText(''); }}><Reply size={11} /> Reply</button>
            <button onClick={onResolve}>{resolved ? <Circle size={11} /> : <CheckCircle2 size={11} />} {resolved ? 'Reopen' : 'Resolve'}</button>
          </div>
        </div>
      </div>

      {replies.map((reply) => (
        <div key={reply.id} className="comment-card reply">
          <span className="team-avatar small">{reply.authorInitials || 'U'}</span>
          <div className="comment-main">
            <div className="comment-meta">
              <b>{reply.authorName || 'Member'}</b>
              <span>{new Date(reply.createdAt).toLocaleString()}</span>
            </div>
            <p className="comment-body">{renderBody(reply.body)}</p>
          </div>
        </div>
      ))}

      {replyTo === comment.id && (
        <div className="comment-reply-compose">
          <CornerDownRight size={12} />
          <input
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            onKeyDown={(e) => { if (e.key === 'Enter' && !busy) onReply(comment.id); }}
          />
          <button onClick={() => onReply(comment.id)} disabled={busy || !replyText.trim()}><Send size={12} /></button>
        </div>
      )}
    </div>
  );
}

/* Render comment text safely (plain text — no HTML execution) with @mention highlighting. */
function renderBody(body: string) {
  const parts = body.split(/(@[A-Za-z0-9._-]+)/g);
  return parts.map((part, index) =>
    /^@[A-Za-z0-9._-]+$/.test(part)
      ? <span key={index} className="comment-mention">{part}</span>
      : <span key={index}>{part}</span>,
  );
}