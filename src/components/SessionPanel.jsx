import { useState } from 'react';
import { Plus, Trash2, Check, Pencil, FileText, Clock } from 'lucide-react';

const formatTime = (ms) => {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString();
};

export default function SessionPanel({
  sessions,
  currentId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState('');

  const startRename = (s) => {
    setEditingId(s.id);
    setDraftName(s.name);
  };

  const commitRename = () => {
    if (editingId && draftName.trim()) {
      onRename(editingId, draftName.trim());
    }
    setEditingId(null);
    setDraftName('');
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">My Tests</h2>
          <p className="text-[11px] text-strand-muted font-mono mt-0.5">
            {sessions.length} saved {sessions.length === 1 ? 'session' : 'sessions'}
          </p>
        </div>
        <button
          onClick={() => onCreate('New session')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-strand-a text-strand-bg text-xs font-medium hover:brightness-110 transition-all"
        >
          <Plus size={14} />
          New Session
        </button>
      </div>

      <div className="space-y-2">
        {sessions.length === 0 ? (
          <div className="bg-strand-panel rounded-2xl p-8 text-center border border-strand-muted/10">
            <FileText size={28} className="text-strand-muted mx-auto mb-2" />
            <p className="text-sm text-strand-muted">No sessions yet.</p>
            <p className="text-[11px] text-strand-muted/70 font-mono mt-1">
              Click "New Session" to start one.
            </p>
          </div>
        ) : (
          sessions.map((s) => {
            const isCurrent = s.id === currentId;
            const isEditing = editingId === s.id;
            const seqLen = s.data.sequence?.length ?? 0;
            const annCount = s.data.annotations?.length ?? 0;
            const hasB = (s.data.sequenceB?.length ?? 0) > 0;

            return (
              <div
                key={s.id}
                onClick={() => !isEditing && onSwitch(s.id)}
                className={`group cursor-pointer rounded-2xl p-4 border transition-colors ${
                  isCurrent
                    ? 'bg-strand-a/10 border-strand-a/40'
                    : 'bg-strand-panel border-strand-muted/10 hover:border-strand-muted/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') {
                            setEditingId(null);
                            setDraftName('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-strand-bg rounded px-2 py-1 text-sm text-strand-text font-medium focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-strand-text truncate">
                          {s.name}
                        </h3>
                        {isCurrent && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-strand-a/20 text-strand-a shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-strand-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(s.updatedAt)}
                      </span>
                      <span>{seqLen} bp</span>
                      {hasB && <span>+compare</span>}
                      {annCount > 0 && <span>{annCount} ann</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(s);
                      }}
                      className="p-1.5 rounded-lg text-strand-muted hover:text-strand-text hover:bg-strand-bg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Rename"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${s.name}"? This cannot be undone.`)) {
                          onDelete(s.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-strand-muted hover:text-strand-t hover:bg-strand-t/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}