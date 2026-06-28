import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ChevronDown, ChevronUp, TreePalm, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { AppConfig, AttendanceRecord, AttendanceStatus, TimetableSlot } from '../types';
import { genId, toDateString, isHolidayDate } from '../types';
import { LectureCard } from './LectureCard';
import { AddExtraLectureDialog } from './AddExtraLectureDialog';

interface Props {
  config: AppConfig;
  records: AttendanceRecord[];
  onUpdateRecords: (r: AttendanceRecord[]) => void;
}

function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 0
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function fmtDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function WeekView({ config, records, onUpdateRecords }: Props) {
  const today = new Date();
  const todayStr = toDateString(today);

  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [expandedDay, setExpandedDay] = useState<string | null>(todayStr);
  const [extraDay, setExtraDay] = useState<string | null>(null);

  const weekDays = getWeekDays(weekStart);
  const isCurrentWeek = toDateString(weekStart) === toDateString(getWeekStart(today));

  const weekLabel = (() => {
    const s = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${s} – ${e}`;
  })();

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToCurrentWeek = () => { setWeekStart(getWeekStart(today)); setExpandedDay(todayStr); };

  const getSlotRecord = (dateStr: string, slotId: string) =>
    records.find(r => r.date === dateStr && r.slotId === slotId && !r.isExtra);

  const markAttendance = (dateStr: string, slot: TimetableSlot, status: AttendanceStatus) => {
    const existing = getSlotRecord(dateStr, slot.id);
    let next: AttendanceRecord[];
    if (existing) {
      next = existing.status === status
        ? records.filter(r => r.id !== existing.id)
        : records.map(r => r.id === existing.id ? { ...r, status } : r);
    } else {
      next = [...records, { id: genId(), date: dateStr, moduleId: slot.moduleId, slotId: slot.id, status }];
    }
    onUpdateRecords(next);
    toast.success({ attended: 'Marked as attended ✓', missed: 'Marked as missed', no_lecture: 'No lecture recorded' }[status]);
  };

  const markExtraAttendance = (recordId: string, status: AttendanceStatus) => {
    onUpdateRecords(records.map(r => r.id === recordId ? { ...r, status } : r));
  };

  const removeExtra = (recordId: string) => {
    onUpdateRecords(records.filter(r => r.id !== recordId));
    toast.success('Removed extra lecture');
  };

  const bulkMarkDay = (dateStr: string, dow: number, status: AttendanceStatus) => {
    const slots = config.timetable.filter(s => s.dayOfWeek === dow);
    if (slots.length === 0) { toast.error('No scheduled slots for this day'); return; }
    let next = [...records];
    for (const slot of slots) {
      const existing = next.find(r => r.date === dateStr && r.slotId === slot.id && !r.isExtra);
      if (existing) {
        next = next.map(r => r.id === existing.id ? { ...r, status } : r);
      } else {
        next.push({ id: genId(), date: dateStr, moduleId: slot.moduleId, slotId: slot.id, status });
      }
    }
    onUpdateRecords(next);
    const label = { attended: 'All marked as attended', missed: 'All marked as missed', no_lecture: 'All marked as no lecture' }[status];
    toast.success(label);
  };

  const addExtraLecture = (dateStr: string, data: {
    moduleId: string; moduleName: string; courseCode: string;
    startTime: string; endTime: string; room?: string;
  }) => {
    onUpdateRecords([...records, {
      id: genId(), date: dateStr, moduleId: data.moduleId,
      slotId: `extra-${genId()}`, status: 'attended', isExtra: true,
      extraModuleName: data.moduleName, extraCourseCode: data.courseCode,
      extraStartTime: data.startTime, extraEndTime: data.endTime, extraRoom: data.room,
    }]);
    toast.success('Extra lecture added');
  };

  return (
    <div className="min-h-full bg-background pb-4">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pt-10 pb-5">
        <div className="max-w-md mx-auto">
          <h1 className="text-primary-foreground">Weekly Attendance</h1>
          <p className="text-sm opacity-70 mt-0.5">Tap any day to view and mark lectures</p>
          <div className="flex items-center justify-between mt-4">
            <button onClick={prevWeek} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-sm">{weekLabel}</p>
              {isCurrentWeek && <p className="text-xs opacity-60 mt-0.5">Current week</p>}
            </div>
            <button onClick={nextWeek} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
          {!isCurrentWeek && (
            <button onClick={goToCurrentWeek}
              className="mt-3 mx-auto block text-xs bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full transition-colors">
              ↩ Jump to current week
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-4 space-y-2">
        {weekDays.map(date => {
          const dateStr = toDateString(date);
          const dow = (date.getDay() + 6) % 7;
          const isToday = dateStr === todayStr;
          const isFuture = date > today && !isToday;
          const isExpanded = expandedDay === dateStr;

          const holiday = isHolidayDate(dateStr, config.holidays ?? []);
          const slots = config.timetable
            .filter(s => s.dayOfWeek === dow)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const dayRecords = records.filter(r => r.date === dateStr);
          const extraRecs = dayRecords.filter(r => r.isExtra);
          const attended = dayRecords.filter(r => r.status === 'attended').length;
          const missed = dayRecords.filter(r => r.status === 'missed').length;
          const noLecture = dayRecords.filter(r => r.status === 'no_lecture').length;
          const totalSlots = slots.length + extraRecs.length;
          const markedCount = dayRecords.filter(r => !r.isExtra).length + extraRecs.length;
          const unmarked = totalSlots - markedCount;

          const shortLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

          return (
            <div key={dateStr}
              className={`rounded-xl border overflow-hidden bg-card transition-colors ${isToday ? 'border-primary' : 'border-border'}`}>

              {/* Day header row */}
              <button className="w-full flex items-center justify-between p-3.5 text-left"
                onClick={() => setExpandedDay(isExpanded ? null : dateStr)}>
                <div className="flex items-center gap-3">
                  {/* Day color dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isToday ? 'bg-primary' :
                    isFuture ? 'bg-muted-foreground/30' :
                    markedCount > 0 ? 'bg-green-500' : 'bg-border'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isToday ? 'text-primary' : 'text-foreground'}`}
                        style={{ fontWeight: isToday ? 600 : 400 }}>
                        {shortLabel}
                      </span>
                      {isToday && (
                        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Today</span>
                      )}
                    </div>
                    {/* Summary line */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {holiday && (
                        <span className="text-xs text-orange-500 flex items-center gap-0.5"><TreePalm size={10} /> {holiday.name}</span>
                      )}
                      {!holiday && totalSlots === 0 && (
                        <span className="text-xs text-muted-foreground">No lectures scheduled</span>
                      )}
                      {attended > 0 && <span className="text-xs text-green-600">{attended} attended</span>}
                      {missed > 0 && <span className="text-xs text-red-500">{missed} missed</span>}
                      {noLecture > 0 && <span className="text-xs text-yellow-600">{noLecture} no lecture</span>}
                      {totalSlots > 0 && unmarked > 0 && (
                        <span className={`text-xs ${isFuture ? 'text-muted-foreground' : 'text-amber-600'}`}>
                          {isFuture ? `${totalSlots} upcoming` : `${unmarked} unmarked`}
                        </span>
                      )}
                      {totalSlots > 0 && unmarked === 0 && markedCount > 0 && (
                        <span className="text-xs text-muted-foreground">All marked</span>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded
                  ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" />
                  : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
              </button>

              {/* Expanded day content */}
              {isExpanded && (
                <div className="border-t border-border px-3 pb-3 pt-3 space-y-2">
                  {/* Holiday banner */}
                  {holiday && (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      <TreePalm size={15} className="text-orange-400 flex-shrink-0" />
                      <p className="text-xs text-orange-700"><span style={{ fontWeight: 600 }}>{holiday.name}</span> — holiday</p>
                    </div>
                  )}

                  {/* Bulk-mark shortcuts (shown when day has scheduled slots) */}
                  {slots.length > 0 && (
                    <div className="flex gap-1.5 pb-1">
                      <span className="text-xs text-muted-foreground self-center mr-1">Mark all:</span>
                      <button onClick={() => bulkMarkDay(dateStr, dow, 'attended')}
                        className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 flex items-center gap-1">
                        <CheckCheck size={11} /> Attended
                      </button>
                      <button onClick={() => bulkMarkDay(dateStr, dow, 'no_lecture')}
                        className="text-xs px-2 py-1 rounded-lg border border-yellow-200 text-yellow-700 hover:bg-yellow-50 flex items-center gap-1">
                        <CheckCheck size={11} /> No Lecture
                      </button>
                    </div>
                  )}

                  {slots.length === 0 && extraRecs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No lectures scheduled</p>
                  ) : (
                    <>
                      {slots.map(slot => {
                        const mod = config.modules.find(m => m.id === slot.moduleId);
                        if (!mod) return null;
                        const rec = getSlotRecord(dateStr, slot.id);
                        return (
                          <LectureCard
                            key={slot.id}
                            name={mod.name}
                            code={mod.courseCode}
                            color={mod.color}
                            startTime={slot.startTime}
                            endTime={slot.endTime}
                            room={slot.room}
                            status={rec?.status}
                            onMark={s => markAttendance(dateStr, slot, s)}
                          />
                        );
                      })}
                      {extraRecs.map(rec => {
                        const mod = config.modules.find(m => m.id === rec.moduleId);
                        return (
                          <LectureCard
                            key={rec.id}
                            name={rec.extraModuleName || mod?.name || 'Unknown'}
                            code={rec.extraCourseCode || mod?.courseCode || ''}
                            color={mod?.color ?? '#6366F1'}
                            startTime={rec.extraStartTime}
                            endTime={rec.extraEndTime}
                            room={rec.extraRoom}
                            status={rec.status}
                            isExtra
                            onMark={s => markExtraAttendance(rec.id, s)}
                            onRemove={() => removeExtra(rec.id)}
                          />
                        );
                      })}
                    </>
                  )}

                  <button
                    onClick={() => setExtraDay(dateStr)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus size={13} /> Add extra lecture for this day
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {extraDay && (
        <AddExtraLectureDialog
          modules={config.modules}
          dateLabel={fmtDateLabel(new Date(extraDay + 'T12:00:00'))}
          onAdd={data => { addExtraLecture(extraDay, data); setExtraDay(null); }}
          onClose={() => setExtraDay(null)}
        />
      )}
    </div>
  );
}
