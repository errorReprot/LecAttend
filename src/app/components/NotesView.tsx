import { useState } from 'react';
import { Plus, Trash2, X, Check, StickyNote } from 'lucide-react';
import type { Note } from '../types';
import { NOTE_COLORS, genId } from '../types';

interface Props {
  notes: Note[];
  onUpdateNotes: (notes: Note[]) => void;
}

export function NotesView({ notes, onUpdateNotes }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const persist = (updated: Note[]) => { onUpdateNotes(updated); };

  const addNote = () => {
    const note: Note = {
      id: genId(),
      title: '',
      content: '',
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [note, ...notes];
    persist(updated);
    setEditingId(note.id);
    setEditTitle('');
    setEditContent('');
  };

  const openEdit = (note: Note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const saveEdit = () => {
    if (!editingId) return;
    persist(notes.map(n => n.id === editingId
      ? { ...n, title: editTitle, content: editContent, updatedAt: new Date().toISOString() }
      : n
    ));
    setEditingId(null);
  };

  const deleteNote = (id: string) => {
    persist(notes.filter(n => n.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const cycleColor = (id: string) => {
    persist(notes.map(n => {
      if (n.id !== id) return n;
      const idx = NOTE_COLORS.indexOf(n.color);
      return { ...n, color: NOTE_COLORS[(idx + 1) % NOTE_COLORS.length] };
    }));
  };

  const editingNote = notes.find(n => n.id === editingId);

  return (
    <div className="min-h-full bg-background pb-4">
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-slate-950 text-primary-foreground px-4 pt-10 pb-6 shadow-lg shadow-orange-500/20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-primary-foreground">Notes</h1>
            <p className="text-sm opacity-70 mt-0.5">Quick reminders & to-dos</p>
          </div>
          <button
            onClick={addNote}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/15"
          >
            <Plus size={16} /> New note
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-5">
        {notes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <StickyNote size={40} className="mx-auto mb-3 opacity-30" />
            <p>No notes yet</p>
            <p className="text-sm mt-1 opacity-60">Tap "New note" to add reminders, to-dos, or anything else.</p>
          </div>
        ) : (
            <div className="grid grid-cols-2 gap-3">
            {notes.map(note => (
              <button
                key={note.id}
                onClick={() => openEdit(note)}
                className="text-left rounded-xl p-3.5 shadow-sm border border-black/5 min-h-[100px] flex flex-col transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: note.color }}
              >
                {note.title && (
                  <p className="text-sm text-gray-900 dark:text-gray-100 mb-1 truncate" style={{ fontWeight: 600 }}>{note.title}</p>
                )}
                <p className="text-xs text-gray-700 dark:text-gray-200 flex-1 line-clamp-4 whitespace-pre-wrap">
                  {note.content || <span className="italic opacity-50">Empty note</span>}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                  {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit overlay */}
      {editingId && editingNote && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: editingNote.color }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 pt-12 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => cycleColor(editingNote.id)}
                className="w-6 h-6 rounded-full border-2 border-gray-400/40 shadow"
                style={{ backgroundColor: NOTE_COLORS[(NOTE_COLORS.indexOf(editingNote.color) + 1) % NOTE_COLORS.length] }}
                title="Change colour"
              />
              <button onClick={() => deleteNote(editingNote.id)} className="p-2 text-gray-500 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
            <button
              onClick={saveEdit}
              className="flex items-center gap-1.5 bg-gray-800/10 hover:bg-gray-800/20 px-3 py-1.5 rounded-lg text-sm text-gray-700 transition-colors"
            >
              <Check size={14} /> Done
            </button>
          </div>

          {/* Note content */}
          <div className="flex-1 overflow-auto px-5 pb-8">
            <input
              autoFocus
              type="text"
              placeholder="Title"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 mb-3"
              style={{ fontSize: '1.25rem', fontWeight: 600 }}
            />
            <textarea
              placeholder="Start typing…"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 resize-none"
              style={{ fontSize: '0.9375rem', lineHeight: 1.6, minHeight: '60vh' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
