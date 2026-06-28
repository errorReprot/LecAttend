import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { Module } from '../types';

interface Props {
  modules: Module[];
  onAdd: (data: {
    moduleId: string;
    moduleName: string;
    courseCode: string;
    startTime: string;
    endTime: string;
    room?: string;
  }) => void;
  onClose: () => void;
  dateLabel?: string; // e.g. "Monday, Jun 16" for past-day context
}

export function AddExtraLectureDialog({ modules, onAdd, onClose, dateLabel }: Props) {
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? '');
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');

  const handleAdd = () => {
    const name = isCustom ? customName.trim() : modules.find(m => m.id === moduleId)?.name ?? '';
    const code = isCustom ? customCode.trim() : modules.find(m => m.id === moduleId)?.courseCode ?? '';
    if (!name) return;
    if (!startTime || !endTime) return;
    onAdd({
      moduleId: isCustom ? `custom-${Date.now()}` : moduleId,
      moduleName: name,
      courseCode: code,
      startTime,
      endTime,
      room: room.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-5 space-y-4 z-10 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground">Add Extra Lecture</h3>
            <p className="text-xs text-amber-600 mt-0.5">
              {dateLabel ? `For ${dateLabel} only` : "Today only"} — won't repeat in future
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Module selection */}
        <div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setIsCustom(false)}
              className={`flex-1 py-2 rounded-lg border text-sm transition-all ${!isCustom ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
            >
              From timetable
            </button>
            <button
              onClick={() => setIsCustom(true)}
              className={`flex-1 py-2 rounded-lg border text-sm transition-all ${isCustom ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
            >
              Custom module
            </button>
          </div>

          {!isCustom ? (
            <select
              value={moduleId}
              onChange={e => setModuleId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {modules.map(m => (
                <option key={m.id} value={m.id}>
                  {m.courseCode ? `${m.courseCode} – ` : ''}{m.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Module name"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                placeholder="Course code (optional)"
                value={customCode}
                onChange={e => setCustomCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">End time</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Room */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Room / Location (optional)</label>
          <input
            type="text"
            placeholder="e.g. Room B204"
            value={room}
            onChange={e => setRoom(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={isCustom ? !customName.trim() : !moduleId}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Plus size={16} /> Add Lecture
        </button>
      </div>
    </div>
  );
}
