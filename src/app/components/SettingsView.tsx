import { useState } from 'react';
import { Trash2, Plus, Clock, MapPin, RefreshCw, ChevronDown, ChevronUp, Edit2, Check, X, Share2, TreePalm } from 'lucide-react';
import { toast } from 'sonner';
import type { AppConfig, AttendanceRecord, Holiday, Module, TimetableSlot } from '../types';
import { MODULE_COLORS, DAY_NAMES, DAY_SHORT, genId } from '../types';
import { ShareModal } from './ShareModal';

interface Props {
  config: AppConfig;
  records: AttendanceRecord[];
  onUpdateConfig: (c: AppConfig) => void;
  onUpdateRecords: (r: AttendanceRecord[]) => void;
  onReset: () => void;
}

interface SlotFormState {
  moduleId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
}

export function SettingsView({ config, records, onUpdateConfig, onUpdateRecords, onReset }: Props) {
  const [showReset, setShowReset] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Holiday state
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayStart, setHolidayStart] = useState('');
  const [holidayEnd, setHolidayEnd] = useState('');

  // Module editing
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  // Add module
  const [showAddModule, setShowAddModule] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');

  // Slot editing (null = none, string = slot id)
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState<SlotFormState>({ moduleId: '', dayOfWeek: 0, startTime: '09:00', endTime: '10:00', room: '' });

  // Add slot per day
  const [addSlotDay, setAddSlotDay] = useState<number | null>(null);
  const [addForm, setAddForm] = useState<SlotFormState>({ moduleId: '', dayOfWeek: 0, startTime: '09:00', endTime: '10:00', room: '' });

  // ── Modules ──
  const saveModule = (id: string) => {
    if (!editName.trim()) return;
    onUpdateConfig({ ...config, modules: config.modules.map(m => m.id === id ? { ...m, name: editName.trim(), courseCode: editCode.trim() } : m) });
    setEditingModule(null);
    toast.success('Module updated');
  };

  const deleteModule = (id: string) => {
    if (!confirm('Delete this module and all its attendance records?')) return;
    onUpdateConfig({ ...config, modules: config.modules.filter(m => m.id !== id), timetable: config.timetable.filter(s => s.moduleId !== id) });
    onUpdateRecords(records.filter(r => r.moduleId !== id));
    toast.success('Module deleted');
  };

  const addModule = () => {
    if (!newName.trim()) return;
    const mod: Module = { id: genId(), name: newName.trim(), courseCode: newCode.trim(), color: MODULE_COLORS[config.modules.length % MODULE_COLORS.length] };
    onUpdateConfig({ ...config, modules: [...config.modules, mod] });
    setNewName(''); setNewCode(''); setShowAddModule(false);
    toast.success('Module added');
  };

  // ── Slots ──
  const startEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot.id);
    setSlotForm({ moduleId: slot.moduleId, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime, room: slot.room ?? '' });
  };

  const saveSlot = (id: string) => {
    if (!slotForm.moduleId) { toast.error('Select a module'); return; }
    if (!slotForm.startTime || !slotForm.endTime || slotForm.startTime >= slotForm.endTime) { toast.error('Check start/end times'); return; }
    const updated = config.timetable.map(s =>
      s.id === id
        ? { ...s, moduleId: slotForm.moduleId, dayOfWeek: slotForm.dayOfWeek, startTime: slotForm.startTime, endTime: slotForm.endTime, room: slotForm.room.trim() || undefined }
        : s
    );
    onUpdateConfig({ ...config, timetable: updated });
    setEditingSlot(null);
    // If day changed, open the new day so user can see it
    setExpandedDay(slotForm.dayOfWeek);
    toast.success('Slot updated');
  };

  const deleteSlot = (id: string) => {
    onUpdateConfig({ ...config, timetable: config.timetable.filter(s => s.id !== id) });
    toast.success('Slot removed');
  };

  const addSlot = (day: number) => {
    if (!addForm.moduleId) { toast.error('Select a module'); return; }
    if (!addForm.startTime || !addForm.endTime || addForm.startTime >= addForm.endTime) { toast.error('Check times'); return; }
    const slot: TimetableSlot = { id: genId(), moduleId: addForm.moduleId, dayOfWeek: day, startTime: addForm.startTime, endTime: addForm.endTime, room: addForm.room.trim() || undefined };
    onUpdateConfig({ ...config, timetable: [...config.timetable, slot] });
    setAddSlotDay(null);
    setAddForm(f => ({ ...f, room: '' }));
    toast.success('Slot added');
  };

  const addHoliday = () => {
    if (!holidayName.trim() || !holidayStart) { toast.error('Name and start date are required'); return; }
    const end = holidayEnd || holidayStart;
    if (end < holidayStart) { toast.error('End date must be on or after start date'); return; }
    const h: Holiday = { id: genId(), name: holidayName.trim(), startDate: holidayStart, endDate: end };
    onUpdateConfig({ ...config, holidays: [...(config.holidays ?? []), h] });
    setHolidayName(''); setHolidayStart(''); setHolidayEnd('');
    setShowAddHoliday(false);
    toast.success('Holiday added');
  };

  const deleteHoliday = (id: string) => {
    onUpdateConfig({ ...config, holidays: (config.holidays ?? []).filter(h => h.id !== id) });
    toast.success('Holiday removed');
  };

  const handleImportTimetable = (mods: Module[], tt: TimetableSlot[]) => {
    // Merge: add new modules (skip if same name+code already exists)
    const existingKeys = new Set(config.modules.map(m => `${m.name.toLowerCase()}|${m.courseCode.toLowerCase()}`));
    const freshMods = mods.filter(m => !existingKeys.has(`${m.name.toLowerCase()}|${m.courseCode.toLowerCase()}`));
    onUpdateConfig({ ...config, modules: [...config.modules, ...freshMods], timetable: [...config.timetable, ...tt] });
  };

  const resetAll = () => {
    onReset();
  };

  const slotsForDay = (day: number) =>
    config.timetable.filter(s => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const slotFormFields = (
    form: SlotFormState,
    setForm: (f: SlotFormState) => void,
    showDayPicker = true
  ) => (
    <div className="space-y-2">
      <select value={form.moduleId} onChange={e => setForm({ ...form, moduleId: e.target.value })}
        className="w-full px-2 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
        <option value="">Select module…</option>
        {config.modules.map(m => <option key={m.id} value={m.id}>{m.courseCode ? `${m.courseCode} – ` : ''}{m.name}</option>)}
      </select>
      {showDayPicker && (
        <select value={form.dayOfWeek} onChange={e => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
          className="w-full px-2 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Start</label>
          <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
            className="w-full px-2 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">End</label>
          <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
            className="w-full px-2 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none" />
        </div>
      </div>
      <input placeholder="Room / Location (optional)" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })}
        className="w-full px-2 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none" />
    </div>
  );

  return (
    <>
    <div className="min-h-full bg-background pb-4">
      <div className="bg-primary text-primary-foreground px-4 pt-10 pb-6">
        <div className="max-w-md mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-primary-foreground">Settings</h1>
            <p className="text-sm opacity-70 mt-0.5">Manage timetable, holidays & more</p>
          </div>
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm transition-colors mt-1"
          >
            <Share2 size={15} /> Share
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-5 space-y-5">

        {/* Semester info */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-muted-foreground text-sm mb-2">Semester</h3>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Start</p>
              <p className="text-sm text-foreground">{config.semesterStart || <span className="italic text-muted-foreground">Not set</span>}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End</p>
              <p className="text-sm text-foreground">{config.semesterEnd || <span className="italic text-muted-foreground">Not set</span>}</p>
            </div>
          </div>
        </div>

        {/* Extra lectures note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
          <span className="text-amber-500 mt-0.5 flex-shrink-0">ℹ️</span>
          <p className="text-xs text-amber-800">
            <strong>Extra lectures</strong> added from the Today screen are one-off — they only appear on the day you add them and never repeat in the timetable.
          </p>
        </div>

        {/* Modules */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground">Modules</h2>
            <button onClick={() => setShowAddModule(v => !v)} className="flex items-center gap-1 text-sm text-primary">
              <Plus size={15} /> Add
            </button>
          </div>

          {showAddModule && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2 mb-3">
              <input placeholder="Module name" value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input placeholder="Course code (optional)" value={newCode} onChange={e => setNewCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <div className="flex gap-2">
                <button onClick={() => setShowAddModule(false)} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground">Cancel</button>
                <button onClick={addModule} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Save</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {config.modules.map(mod => (
              <div key={mod.id} className="bg-card border border-border rounded-xl p-3">
                {editingModule === mod.id ? (
                  <div className="space-y-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <input value={editCode} onChange={e => setEditCode(e.target.value)} placeholder="Course code"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingModule(null)} className="p-1.5 border border-border rounded-lg text-muted-foreground"><X size={14} /></button>
                      <button onClick={() => saveModule(mod.id)} className="p-1.5 bg-primary text-primary-foreground rounded-lg"><Check size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: mod.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{mod.name}</p>
                      {mod.courseCode && <p className="text-xs text-muted-foreground">{mod.courseCode}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingModule(mod.id); setEditName(mod.name); setEditCode(mod.courseCode); }}
                        className="p-1.5 text-muted-foreground hover:text-foreground"><Edit2 size={13} /></button>
                      <button onClick={() => deleteModule(mod.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Timetable */}
        <div>
          <div className="mb-3">
            <h2 className="text-foreground">Weekly Timetable</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Tap a slot's edit button to change its day, time, or room.</p>
          </div>
          <div className="space-y-2">
            {DAY_NAMES.map((dayName, i) => {
              const slots = slotsForDay(i);
              const isOpen = expandedDay === i;
              return (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button className="w-full flex items-center justify-between p-3 text-left"
                    onClick={() => setExpandedDay(isOpen ? null : i)}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">{dayName}</span>
                      {slots.length > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{slots.length}</span>
                      )}
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                      {slots.map(slot => {
                        const mod = config.modules.find(m => m.id === slot.moduleId);
                        const isEditing = editingSlot === slot.id;
                        return (
                          <div key={slot.id} className="rounded-lg border border-border overflow-hidden">
                            {isEditing ? (
                              <div className="p-3 space-y-3 bg-muted/30">
                                <p className="text-xs text-muted-foreground">Edit slot — you can move it to a different day</p>
                                {slotFormFields(slotForm, setSlotForm, true)}
                                <div className="flex gap-2">
                                  <button onClick={() => setEditingSlot(null)}
                                    className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted-foreground flex items-center justify-center gap-1">
                                    <X size={12} /> Cancel
                                  </button>
                                  <button onClick={() => saveSlot(slot.id)}
                                    className="flex-1 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs flex items-center justify-center gap-1">
                                    <Check size={12} /> Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-2.5">
                                <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: mod?.color }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground truncate">{mod?.name || 'Unknown'}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock size={10} /><span>{slot.startTime} – {slot.endTime}</span>
                                    {slot.room && <><MapPin size={10} /><span>{slot.room}</span></>}
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button onClick={() => startEditSlot(slot)}
                                    className="p-1.5 text-muted-foreground hover:text-primary rounded" title="Edit slot">
                                    <Edit2 size={13} />
                                  </button>
                                  <button onClick={() => deleteSlot(slot.id)}
                                    className="p-1.5 text-muted-foreground hover:text-destructive rounded" title="Delete slot">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {addSlotDay === i ? (
                        <div className="space-y-2 pt-1 p-2 bg-muted/30 rounded-lg">
                          {slotFormFields({ ...addForm, dayOfWeek: i }, f => setAddForm(f), false)}
                          <div className="flex gap-2">
                            <button onClick={() => setAddSlotDay(null)} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted-foreground">Cancel</button>
                            <button onClick={() => addSlot(i)} className="flex-1 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs">Add</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddSlotDay(i); setAddForm({ moduleId: config.modules[0]?.id || '', dayOfWeek: i, startTime: '09:00', endTime: '10:00', room: '' }); }}
                          className="w-full py-1.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={12} /> Add slot
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Holidays & Closures */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-foreground">Holidays & Closures</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Marked days show a holiday banner instead of lectures</p>
            </div>
            <button onClick={() => setShowAddHoliday(v => !v)} className="flex items-center gap-1 text-sm text-primary">
              <Plus size={15} /> Add
            </button>
          </div>

          {showAddHoliday && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 mb-3">
              <input placeholder="Holiday name (e.g. Christmas Break)" value={holidayName} onChange={e => setHolidayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Start date</label>
                  <input type="date" value={holidayStart} onChange={e => setHolidayStart(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">End date <span className="opacity-60">(optional)</span></label>
                  <input type="date" value={holidayEnd} onChange={e => setHolidayEnd(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddHoliday(false)} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground">Cancel</button>
                <button onClick={addHoliday} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Save</button>
              </div>
            </div>
          )}

          {(config.holidays ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 bg-muted rounded-xl">No holidays added yet</p>
          ) : (
            <div className="space-y-2">
              {(config.holidays ?? []).map(h => (
                <div key={h.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <TreePalm size={16} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.startDate === h.endDate ? h.startDate : `${h.startDate} – ${h.endDate}`}
                    </p>
                  </div>
                  <button onClick={() => deleteHoliday(h.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="border border-destructive/30 rounded-xl p-4 space-y-3">
          <h3 className="text-destructive text-sm">Danger Zone</h3>
          {!showReset ? (
            <button onClick={() => setShowReset(true)} className="flex items-center gap-2 text-sm text-destructive">
              <RefreshCw size={14} /> Reset everything
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">This will delete all data and restart setup. Are you sure?</p>
              <div className="flex gap-2">
                <button onClick={() => setShowReset(false)} className="flex-1 py-2 border border-border rounded-lg text-sm">Cancel</button>
                <button onClick={resetAll} className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm">Reset All</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {showShare && (
      <ShareModal
        config={config}
        onImport={handleImportTimetable}
        onClose={() => setShowShare(false)}
      />
    )}
    </>
  );
}
