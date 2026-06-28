import { useState } from 'react';
import { X, Copy, Download, Upload, Check, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { AppConfig, Module, TimetableSlot } from '../types';
import { DAY_SHORT, genId, toDateString } from '../types';

// ── Encode / decode share code ────────────────────────────────────────────

function encodeConfig(config: AppConfig): string {
  const payload = { modules: config.modules, timetable: config.timetable };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function decodeConfig(code: string): { modules: Module[]; timetable: TimetableSlot[] } | null {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const data = JSON.parse(json);
    if (Array.isArray(data.modules) && Array.isArray(data.timetable)) return data;
  } catch { /* ignore */ }
  return null;
}

// ── CSV export ────────────────────────────────────────────────────────────

function exportCSV(config: AppConfig): string {
  const rows = ['Module Name,Course Code,Day,Start Time,End Time,Room'];
  for (const slot of config.timetable) {
    const mod = config.modules.find(m => m.id === slot.moduleId);
    if (!mod) continue;
    const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][slot.dayOfWeek];
    rows.push([mod.name, mod.courseCode, day, slot.startTime, slot.endTime, slot.room ?? ''].map(v => `"${v}"`).join(','));
  }
  return rows.join('\n');
}

// ── ICS (iCalendar) export ────────────────────────────────────────────────

const ICS_BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

function firstOccurrence(dayOfWeek: number, fromStr: string): string {
  const from = new Date(fromStr + 'T00:00:00');
  const fromDow = (from.getDay() + 6) % 7;
  let diff = dayOfWeek - fromDow;
  if (diff < 0) diff += 7;
  from.setDate(from.getDate() + diff);
  return toDateString(from);
}

function icsDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const [h, min] = timeStr.split(':');
  return `${y}${m}${d}T${h}${min}00`;
}

function exportICS(config: AppConfig): string {
  const today = toDateString(new Date());
  const baseDate = config.semesterStart || today;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//College Attendance Tracker//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
  ];
  for (const slot of config.timetable) {
    const mod = config.modules.find(m => m.id === slot.moduleId);
    if (!mod) continue;
    const first = firstOccurrence(slot.dayOfWeek, baseDate);
    const dtstart = icsDateTime(first, slot.startTime);
    const dtend = icsDateTime(first, slot.endTime || slot.startTime);
    let rrule = `RRULE:FREQ=WEEKLY;BYDAY=${ICS_BYDAY[slot.dayOfWeek]}`;
    if (config.semesterEnd) {
      const [y, m, d] = config.semesterEnd.split('-');
      rrule += `;UNTIL=${y}${m}${d}T235959Z`;
    }
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${slot.id}@att-tracker`);
    lines.push(`SUMMARY:${mod.name}${mod.courseCode ? ` (${mod.courseCode})` : ''}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    lines.push(rrule);
    if (slot.room) lines.push(`LOCATION:${slot.room}`);
    lines.push('END:VEVENT');
  }
  // Add holidays
  for (const h of config.holidays ?? []) {
    const [y, m, d] = h.startDate.split('-');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:holiday-${h.id}@att-tracker`);
    lines.push(`SUMMARY:🏖 ${h.name}`);
    lines.push(`DTSTART;VALUE=DATE:${y}${m}${d}`);
    const [ye, me, de] = h.endDate.split('-');
    // DTEND for all-day is exclusive (next day)
    const endDay = new Date(h.endDate + 'T00:00:00');
    endDay.setDate(endDay.getDate() + 1);
    const ed = toDateString(endDay).replace(/-/g, '');
    lines.push(`DTEND;VALUE=DATE:${ed}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────

type TabId = 'share' | 'import' | 'calendar';

interface Props {
  config: AppConfig;
  onImport: (mods: Module[], tt: TimetableSlot[]) => void;
  onClose: () => void;
}

export function ShareModal({ config, onImport, onClose }: Props) {
  const [tab, setTab] = useState<TabId>('share');
  const [importCode, setImportCode] = useState('');
  const [importResult, setImportResult] = useState<ReturnType<typeof decodeConfig>>(null);
  const [importError, setImportError] = useState('');
  const [copied, setCopied] = useState(false);

  const shareCode = encodeConfig(config);

  const copyCode = () => {
    navigator.clipboard.writeText(shareCode).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast.success('Share code copied!');
    });
  };

  const handleParseImport = () => {
    setImportError('');
    setImportResult(null);
    const result = decodeConfig(importCode);
    if (!result) { setImportError('Invalid code — make sure you copied it correctly.'); return; }
    setImportResult(result);
  };

  const handleImport = () => {
    if (!importResult) return;
    // Re-assign IDs to avoid collisions
    const modIdMap = new Map<string, string>();
    const newMods: Module[] = importResult.modules.map(m => {
      const newId = genId();
      modIdMap.set(m.id, newId);
      return { ...m, id: newId };
    });
    const newTT: TimetableSlot[] = importResult.timetable.map(s => ({
      ...s,
      id: genId(),
      moduleId: modIdMap.get(s.moduleId) ?? s.moduleId,
    }));
    onImport(newMods, newTT);
    toast.success(`Imported ${newMods.length} modules and ${newTT.length} slots`);
    onClose();
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: 'share', label: 'Share' },
    { id: 'import', label: 'Import' },
    { id: 'calendar', label: 'Calendar' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-xl z-10 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-foreground">Share & Export</h3>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm border-b-2 transition-colors -mb-px ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* ── SHARE tab ── */}
          {tab === 'share' && (
            <>
              <p className="text-sm text-muted-foreground">Generate a code your friends can paste to instantly get your modules and timetable.</p>
              <div className="bg-muted rounded-xl p-3 font-mono text-xs break-all text-muted-foreground select-all border border-border">
                {shareCode.slice(0, 80)}…
              </div>
              <button onClick={copyCode}
                className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all ${copied ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Share Code</>}
              </button>
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">Export options</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => downloadFile(exportCSV(config), 'timetable.csv', 'text/csv')}
                    className="flex items-center justify-center gap-1.5 py-2 border border-border rounded-xl text-sm text-foreground hover:bg-muted transition-colors">
                    <Download size={14} /> Export CSV
                  </button>
                  <button
                    onClick={() => { downloadFile(exportICS(config), 'timetable.ics', 'text/calendar'); toast.success('Downloaded timetable.ics'); }}
                    className="flex items-center justify-center gap-1.5 py-2 border border-border rounded-xl text-sm text-foreground hover:bg-muted transition-colors">
                    <Download size={14} /> Export .ics
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── IMPORT tab ── */}
          {tab === 'import' && (
            <>
              <p className="text-sm text-muted-foreground">Paste a share code from a friend to add their modules and schedule to yours.</p>
              <textarea
                value={importCode}
                onChange={e => { setImportCode(e.target.value); setImportResult(null); setImportError(''); }}
                placeholder="Paste share code here…"
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              {importError && (
                <p className="text-destructive text-sm flex items-center gap-1.5"><AlertCircle size={13} /> {importError}</p>
              )}
              {importResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
                  <p className="text-sm text-green-700 flex items-center gap-1.5"><Check size={13} /> Valid timetable found</p>
                  <p className="text-xs text-green-600">{importResult.modules.length} modules · {importResult.timetable.length} slots</p>
                  {importResult.modules.map(m => (
                    <p key={m.id} className="text-xs text-green-700 ml-2">• {m.name}{m.courseCode ? ` (${m.courseCode})` : ''}</p>
                  ))}
                </div>
              )}
              {!importResult ? (
                <button onClick={handleParseImport} disabled={!importCode.trim()}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm disabled:opacity-40">
                  Check Code
                </button>
              ) : (
                <button onClick={handleImport}
                  className="w-full py-2.5 bg-green-500 text-white rounded-xl flex items-center justify-center gap-2 text-sm">
                  <Upload size={15} /> Import Timetable
                </button>
              )}
              <p className="text-xs text-muted-foreground text-center">Importing merges into your existing timetable — it doesn't replace it.</p>
            </>
          )}

          {/* ── CALENDAR tab ── */}
          {tab === 'calendar' && (
            <>
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Calendar size={20} className="text-blue-500 flex-shrink-0" />
                <p className="text-sm text-blue-800">Export your timetable as an .ics file to add recurring lectures to Google Calendar, Apple Calendar, or Outlook.</p>
              </div>
              <button
                onClick={() => { downloadFile(exportICS(config), 'timetable.ics', 'text/calendar'); toast.success('Downloading timetable.ics…'); }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2">
                <Download size={16} /> Download timetable.ics
              </button>
              <div className="border border-border rounded-xl p-4 space-y-2">
                <p className="text-sm text-foreground">How to import into Google Calendar:</p>
                {['Download the .ics file above', 'Open Google Calendar on desktop', 'Click the ⚙ gear → Settings → Import & export', 'Click Import, select the downloaded file'].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">Note: this is a one-time export. Changes made later won't sync automatically.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
