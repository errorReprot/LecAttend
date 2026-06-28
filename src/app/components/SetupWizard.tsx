import { useState } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft, GraduationCap, Clock, MapPin, Check, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AppConfig, Module, TimetableSlot } from '../types';
import { MODULE_COLORS, DAY_NAMES, DAY_SHORT, genId } from '../types';

interface Props {
  onComplete: (config: AppConfig) => void;
}

// ── CSV parsing helpers ────────────────────────────────────────────────────

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result.map(s => s.trim());
}

function normalizeTime(t: string): string {
  if (!t) return '';
  const clean = t.trim();
  if (/^\d{1,2}:\d{2}$/.test(clean)) {
    const [h, m] = clean.split(':');
    return `${String(Number(h)).padStart(2, '0')}:${m}`;
  }
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let h = Number(match[1]);
    const m = match[2];
    const ap = match[3]?.toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  return '';
}

const DAY_MAP: Record<string, number> = {
  monday: 0, mon: 0,
  tuesday: 1, tue: 1, tues: 1,
  wednesday: 2, wed: 2,
  thursday: 3, thu: 3, thurs: 3,
  friday: 4, fri: 4,
  saturday: 5, sat: 5,
  sunday: 6, sun: 6,
};

interface ParseResult {
  modules: Module[];
  timetable: TimetableSlot[];
  errors: string[];
}

function parseCSVText(text: string): ParseResult {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const errors: string[] = [];
  const moduleMap = new Map<string, Module>();
  const slots: TimetableSlot[] = [];

  let start = 0;
  const firstCols = parseCSVRow(lines[0] ?? '');
  if (firstCols[0].toLowerCase().replace(/\s/g, '').match(/modulename|module|name|subject/)) {
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    if (cols.length < 3) { errors.push(`Row ${i + 1}: too few columns (skipped)`); continue; }

    const name = cols[0] ?? '';
    const code = cols[1] ?? '';
    const dayRaw = cols[2] ?? '';
    const startRaw = cols[3] ?? '';
    const endRaw = cols[4] ?? '';
    const room = cols[5] ?? '';

    if (!name) { errors.push(`Row ${i + 1}: empty module name (skipped)`); continue; }

    const dayNum = DAY_MAP[dayRaw.toLowerCase()];
    if (dayNum === undefined) { errors.push(`Row ${i + 1}: unknown day "${dayRaw}" (skipped)`); continue; }

    const startTime = normalizeTime(startRaw);
    if (!startTime) { errors.push(`Row ${i + 1}: invalid start time "${startRaw}" (skipped)`); continue; }
    const endTime = normalizeTime(endRaw) || startTime;

    const key = `${name.toLowerCase()}||${code.toLowerCase()}`;
    if (!moduleMap.has(key)) {
      moduleMap.set(key, {
        id: genId(),
        name,
        courseCode: code,
        color: MODULE_COLORS[moduleMap.size % MODULE_COLORS.length],
      });
    }
    const mod = moduleMap.get(key)!;
    slots.push({ id: genId(), moduleId: mod.id, dayOfWeek: dayNum, startTime, endTime, room: room || undefined });
  }

  return { modules: Array.from(moduleMap.values()), timetable: slots, errors };
}

// ── Wizard component ───────────────────────────────────────────────────────

type InputMode = 'manual' | 'csv';

export function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [semesterStart, setSemesterStart] = useState('');
  const [semesterEnd, setSemesterEnd] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('manual');

  // Manual state
  const [modules, setModules] = useState<Module[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotModule, setSlotModule] = useState('');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:00');
  const [slotRoom, setSlotRoom] = useState('');

  // CSV state
  const [csvText, setCsvText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // ── Manual helpers ──
  const addModule = () => {
    if (!newName.trim()) { toast.error('Module name is required'); return; }
    const mod: Module = { id: genId(), name: newName.trim(), courseCode: newCode.trim(), color: MODULE_COLORS[modules.length % MODULE_COLORS.length] };
    setModules(p => [...p, mod]);
    setNewName(''); setNewCode('');
  };
  const removeModule = (id: string) => { setModules(p => p.filter(m => m.id !== id)); setTimetable(p => p.filter(s => s.moduleId !== id)); };
  const addSlot = () => {
    if (!slotModule) { toast.error('Select a module'); return; }
    if (!slotStart || !slotEnd || slotStart >= slotEnd) { toast.error('Check start/end times'); return; }
    const slot: TimetableSlot = { id: genId(), moduleId: slotModule, dayOfWeek: selectedDay, startTime: slotStart, endTime: slotEnd, room: slotRoom.trim() || undefined };
    setTimetable(p => [...p, slot]);
    setSlotRoom(''); setShowSlotForm(false);
  };
  const removeSlot = (id: string) => setTimetable(p => p.filter(s => s.id !== id));
  const slotsForDay = (day: number) => timetable.filter(s => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // ── CSV helpers ──
  const handleParse = () => {
    if (!csvText.trim()) { toast.error('Paste your CSV first'); return; }
    const result = parseCSVText(csvText);
    setParseResult(result);
    if (result.modules.length === 0) {
      toast.error('Could not find any valid rows. Check the format.');
    } else {
      toast.success(`Parsed ${result.modules.length} module(s), ${result.timetable.length} slot(s)`);
    }
  };

  const handleComplete = (mods = modules, tt = timetable) => {
    onComplete({ semesterStart, semesterEnd, modules: mods, timetable: tt, holidays: [] });
  };

  const datesValid = !semesterStart || !semesterEnd || semesterStart < semesterEnd;
  const canProceed2 = modules.length > 0;

  const csvReady = parseResult && parseResult.modules.length > 0;

  // Step labels change based on mode
  const totalSteps = inputMode === 'csv' ? 2 : 3;
  const stepLabels: Record<number, string> = inputMode === 'csv'
    ? { 1: 'Semester Info', 2: 'Import CSV' }
    : { 1: 'Semester Info', 2: 'Your Modules', 3: 'Weekly Schedule' };

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pt-10 pb-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <GraduationCap size={18} />
            </div>
            <span className="opacity-80 text-sm">Attendance Tracker Setup</span>
          </div>
          <h1 className="text-primary-foreground">Step {step} of {totalSteps}: {stepLabels[step]}</h1>
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={`h-1 rounded-full flex-1 transition-all ${i < step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-md mx-auto px-4 py-6">

          {/* ── STEP 1: Semester dates ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center py-2">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <GraduationCap size={28} className="text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">Set your semester period. Both fields are optional — you can skip if you don't know the dates yet.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Semester Start Date <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input type="date" value={semesterStart} onChange={e => setSemesterStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-1.5">
                    Semester End Date <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input type="date" value={semesterEnd} onChange={e => setSemesterEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                {!datesValid && (
                  <p className="text-destructive text-sm flex items-center gap-1.5"><AlertCircle size={14} /> End date must be after start date.</p>
                )}
              </div>

              {/* Input mode selection */}
              <div>
                <p className="text-sm text-foreground mb-2">How would you like to set up your timetable?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInputMode('manual')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${inputMode === 'manual' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <Plus size={16} className="text-primary" />
                    </div>
                    <p className="text-sm text-foreground">Manual entry</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Add modules and schedule step by step</p>
                  </button>
                  <button
                    onClick={() => setInputMode('csv')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${inputMode === 'csv' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <FileText size={16} className="text-primary" />
                    </div>
                    <p className="text-sm text-foreground">Import CSV</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Paste from AI-generated CSV</p>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!datesValid}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── STEP 2 (CSV mode): Import CSV ── */}
          {step === 2 && inputMode === 'csv' && (
            <div className="space-y-4">
              {/* AI prompt hint */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm text-foreground mb-2">Use this prompt with an AI chatbot (ChatGPT, Gemini, etc.):</p>
                <div className="bg-background rounded-lg p-3 text-xs text-muted-foreground font-mono leading-relaxed select-all border border-border">
                  {`Convert my timetable to CSV with these exact columns:\nModule Name, Course Code, Day, Start Time, End Time, Room\n\nRules:\n- Full day names (Monday, Tuesday…)\n- 24-hour time (09:00, 14:30)\n- One row per lecture slot\n- Include header row\n- Leave Room blank if unknown`}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Upload your timetable image alongside this prompt, then paste the CSV output below.</p>
              </div>

              {/* CSV textarea */}
              <div>
                <label className="block text-sm text-foreground mb-1.5">Paste your CSV here</label>
                <textarea
                  value={csvText}
                  onChange={e => { setCsvText(e.target.value); setParseResult(null); }}
                  placeholder={`Module Name,Course Code,Day,Start Time,End Time,Room\nComputer Science,CS101,Monday,09:00,11:00,Room A204\nMathematics,MATH201,Tuesday,14:00,15:00,Room B102\nMathematics,MATH201,Thursday,14:00,15:00,Room B102`}
                  rows={8}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-mono resize-none"
                />
              </div>

              <button
                onClick={handleParse}
                disabled={!csvText.trim()}
                className="w-full py-2.5 border border-primary text-primary rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 text-sm"
              >
                <FileText size={16} /> Parse CSV
              </button>

              {/* Parse result preview */}
              {parseResult && (
                <div className="space-y-3">
                  {parseResult.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                      <p className="text-xs text-amber-700 flex items-center gap-1"><AlertCircle size={12} /> {parseResult.errors.length} row(s) skipped:</p>
                      {parseResult.errors.map((e, i) => <p key={i} className="text-xs text-amber-600 ml-4">{e}</p>)}
                    </div>
                  )}

                  {csvReady && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
                      <p className="text-sm text-green-700 flex items-center gap-1.5"><CheckCircle2 size={14} /> Ready to import</p>
                      <div className="space-y-1">
                        {parseResult.modules.map(m => {
                          const modSlots = parseResult.timetable.filter(s => s.moduleId === m.id);
                          return (
                            <div key={m.id} className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: m.color }} />
                              <div>
                                <span className="text-xs text-green-800">{m.name}{m.courseCode ? ` (${m.courseCode})` : ''}</span>
                                <span className="text-xs text-green-600 ml-1">— {modSlots.length} slot{modSlots.length !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-green-600">{parseResult.timetable.length} total lecture slots across {parseResult.modules.length} module(s)</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-border rounded-xl flex items-center justify-center gap-2 text-foreground">
                  <ChevronLeft size={18} /> Back
                </button>
                <button
                  onClick={() => csvReady && handleComplete(parseResult!.modules, parseResult!.timetable)}
                  disabled={!csvReady}
                  className="flex-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Check size={18} /> Complete Setup
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2 (Manual mode): Add modules ── */}
          {step === 2 && inputMode === 'manual' && (
            <div className="space-y-5">
              <p className="text-muted-foreground text-sm">Add all your modules/subjects for this semester.</p>

              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <input type="text" placeholder="Module name (e.g. Computer Science)" value={newName}
                  onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addModule()}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input type="text" placeholder="Course code (e.g. CS101) — optional" value={newCode}
                  onChange={e => setNewCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && addModule()}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={addModule} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg flex items-center justify-center gap-2">
                  <Plus size={16} /> Add Module
                </button>
              </div>

              {modules.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Added ({modules.length})</p>
                  {modules.map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate">{m.name}</p>
                        {m.courseCode && <p className="text-xs text-muted-foreground">{m.courseCode}</p>}
                      </div>
                      <button onClick={() => removeModule(m.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">No modules added yet</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-border rounded-xl flex items-center justify-center gap-2 text-foreground">
                  <ChevronLeft size={18} /> Back
                </button>
                <button
                  onClick={() => { setSlotModule(modules[0]?.id || ''); setStep(3); }}
                  disabled={!canProceed2}
                  className="flex-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  Next <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 (Manual mode): Schedule ── */}
          {step === 3 && inputMode === 'manual' && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">Set your weekly lecture schedule. Skip days with no lectures.</p>

              <div className="grid grid-cols-7 gap-1">
                {DAY_SHORT.map((d, i) => (
                  <button key={i} onClick={() => { setSelectedDay(i); setShowSlotForm(false); }}
                    className={`py-2 rounded-lg text-xs transition-all ${selectedDay === i ? 'bg-primary text-primary-foreground' : slotsForDay(i).length > 0 ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-muted text-muted-foreground'}`}>
                    {d}
                    {slotsForDay(i).length > 0 && (
                      <span className={`block text-center ${selectedDay === i ? 'text-white/70' : 'text-primary/70'}`} style={{ fontSize: '10px' }}>{slotsForDay(i).length}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{DAY_NAMES[selectedDay]}'s lectures</p>
                {slotsForDay(selectedDay).length === 0 && !showSlotForm && (
                  <p className="text-center text-muted-foreground text-sm py-3 bg-muted rounded-xl">No lectures — tap below to add one</p>
                )}
                {slotsForDay(selectedDay).map(slot => {
                  const mod = modules.find(m => m.id === slot.moduleId);
                  return (
                    <div key={slot.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: mod?.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{mod?.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock size={11} /><span>{slot.startTime} – {slot.endTime}</span>
                          {slot.room && <><MapPin size={11} /><span>{slot.room}</span></>}
                        </div>
                      </div>
                      <button onClick={() => removeSlot(slot.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  );
                })}
              </div>

              {showSlotForm ? (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <p className="text-sm text-foreground">Add lecture to {DAY_NAMES[selectedDay]}</p>
                  <select value={slotModule} onChange={e => setSlotModule(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Select module…</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.courseCode ? `${m.courseCode} – ` : ''}{m.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Start</label>
                      <input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">End</label>
                      <input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background focus:outline-none" />
                    </div>
                  </div>
                  <input type="text" placeholder="Room / Location (optional)" value={slotRoom} onChange={e => setSlotRoom(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowSlotForm(false)} className="flex-1 py-2 border border-border rounded-lg text-muted-foreground text-sm">Cancel</button>
                    <button onClick={addSlot} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-1">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setSlotModule(modules[0]?.id || ''); setShowSlotForm(true); }}
                  className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm">
                  <Plus size={16} /> Add lecture to {DAY_NAMES[selectedDay]}
                </button>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-border rounded-xl flex items-center justify-center gap-2 text-foreground">
                  <ChevronLeft size={18} /> Back
                </button>
                <button onClick={() => handleComplete()}
                  className="flex-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2">
                  <Check size={18} /> Complete Setup
                </button>
              </div>
              <p className="text-center text-xs text-muted-foreground">You can edit the schedule anytime in Settings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
