import { useState } from 'react';
import { CalendarDays, Plus, TreePalm } from 'lucide-react';
import { toast } from 'sonner';
import type { AppConfig, AttendanceRecord, AttendanceStatus, TimetableSlot } from '../types';
import { DAY_NAMES, genId, getTodayDayOfWeek, toDateString, isHolidayDate } from '../types';
import { AddExtraLectureDialog } from './AddExtraLectureDialog';
import { LectureCard } from './LectureCard';

interface Props {
  config: AppConfig;
  records: AttendanceRecord[];
  onUpdateRecords: (r: AttendanceRecord[]) => void;
}

export function Dashboard({ config, records, onUpdateRecords }: Props) {
  const today = new Date();
  const todayStr = toDateString(today);
  const todayDow = getTodayDayOfWeek();
  const [showAddExtra, setShowAddExtra] = useState(false);

  const todayRecords = records.filter(r => r.date === todayStr);
  const todaySlots = config.timetable
    .filter(s => s.dayOfWeek === todayDow)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const extraRecords = todayRecords.filter(r => r.isExtra);

  const isWithinSemester = (dateStr: string) => {
    if (!config.semesterStart && !config.semesterEnd) return true;
    if (config.semesterStart && dateStr < config.semesterStart) return false;
    if (config.semesterEnd && dateStr > config.semesterEnd) return false;
    return true;
  };

  const getModule = (id: string) => config.modules.find(m => m.id === id);
  const getSlotRecord = (slotId: string) => todayRecords.find(r => r.slotId === slotId && !r.isExtra);

  const markAttendance = (slot: TimetableSlot, status: AttendanceStatus) => {
    const existing = getSlotRecord(slot.id);
    let next: AttendanceRecord[];

    if (existing) {
      if (existing.status === status) {
        next = records.filter(r => r.id !== existing.id);
      } else {
        next = records.map(r => r.id === existing.id ? { ...r, status } : r);
      }
    } else {
      next = [...records, { id: genId(), date: todayStr, moduleId: slot.moduleId, slotId: slot.id, status }];
    }
    onUpdateRecords(next);

    const label = { attended: 'Marked as attended ✓', missed: 'Marked as missed', no_lecture: 'No lecture recorded' }[status];
    toast.success(label);
  };

  const markExtraAttendance = (recordId: string, status: AttendanceStatus) => {
    onUpdateRecords(records.map(r => r.id === recordId ? { ...r, status } : r));
  };

  const removeExtra = (recordId: string) => {
    onUpdateRecords(records.filter(r => r.id !== recordId));
    toast.success('Removed extra lecture');
  };

  const addExtraLecture = (data: {
    moduleId: string;
    moduleName: string;
    courseCode: string;
    startTime: string;
    endTime: string;
    room?: string;
  }) => {
    const record: AttendanceRecord = {
      id: genId(),
      date: todayStr,
      moduleId: data.moduleId,
      slotId: `extra-${genId()}`,
      status: 'attended',
      isExtra: true,
      extraModuleName: data.moduleName,
      extraCourseCode: data.courseCode,
      extraStartTime: data.startTime,
      extraEndTime: data.endTime,
      extraRoom: data.room,
    };
    onUpdateRecords([...records, record]);
    toast.success('Extra lecture added');
  };

  const semStart = config.semesterStart ? new Date(config.semesterStart) : null;
  const semEnd = config.semesterEnd ? new Date(config.semesterEnd) : null;
  const semProgress = semStart
    ? semEnd
      ? Math.round(Math.max(0, Math.min(1, (today.getTime() - semStart.getTime()) / Math.max(1, semEnd.getTime() - semStart.getTime()))) * 100)
      : Math.max(0, Math.round(Math.max(0, (today.getTime() - semStart.getTime()) / Math.max(1, 1000 * 60 * 60 * 24)) * 2))
    : null;

  const allRecords = records.filter(r => {
    if (!semStart && !semEnd) return true;
    const d = new Date(r.date);
    if (semStart && d < semStart) return false;
    if (semEnd && d > semEnd) return false;
    return true;
  });
  const attended = allRecords.filter(r => r.status === 'attended').length;
  const missed = allRecords.filter(r => r.status === 'missed').length;
  const total = attended + missed;
  const pct = total > 0 ? Math.round((attended / total) * 100) : null;

  const totalSlots = todaySlots.length + extraRecords.length;
  const markedToday = todayRecords.length;

  const todayHoliday = isHolidayDate(todayStr, config.holidays ?? []);
  const semesterStarted = !config.semesterStart || todayStr >= config.semesterStart;

  return (
    <div className="min-h-full bg-background pb-4">
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-slate-950 text-primary-foreground px-4 pt-10 pb-6 shadow-lg shadow-orange-500/20">
        <div className="max-w-md mx-auto">
          <p className="text-sm opacity-75">{DAY_NAMES[todayDow]}</p>
          <h1 className="text-primary-foreground mt-0.5">
            {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h1>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/10 border border-white/15 p-3 backdrop-blur-sm">
              <div className="flex justify-between text-[11px] uppercase tracking-wide opacity-75 mb-1">
                {semProgress !== null
                  ? <span>Semester {semProgress}% complete</span>
                  : <span>No semester dates set</span>
                }
                {pct !== null && <span>{pct}% attendance</span>}
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-1.5 bg-white rounded-full transition-all shadow-[0_0_12px_rgba(255,255,255,0.45)]" style={{ width: `${semProgress ?? 0}%` }} />
              </div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/15 p-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-wide opacity-75">Marked today</p>
              <p className="text-lg font-semibold leading-tight mt-1">{markedToday}/{totalSlots || 0}</p>
            </div>
          </div>
          {totalSlots > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur-sm">
              <div className={`w-2 h-2 rounded-full ${markedToday >= totalSlots ? 'bg-green-400' : 'bg-amber-300'}`} />
              <span>{markedToday}/{totalSlots} lectures marked today</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-5">
        {todayHoliday && (
          <div className="flex items-center gap-3 rounded-xl border border-orange-200/70 bg-orange-50/90 p-4 mb-4 shadow-sm dark:bg-orange-500/10 dark:border-orange-400/20">
            <TreePalm size={22} className="text-orange-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-orange-800 dark:text-orange-200" style={{ fontWeight: 600 }}>{todayHoliday.name}</p>
              <p className="text-xs text-orange-600 dark:text-orange-300">Holiday — no lectures today</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-foreground">Today's Schedule</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border/70">
            {totalSlots} lecture{totalSlots !== 1 ? 's' : ''}
          </span>
        </div>

        {!semesterStarted ? (
          <div className="text-center py-14 text-muted-foreground">
            <CalendarDays className="mx-auto mb-3 opacity-30" size={44} />
            <p>Semester has not started yet</p>
            <p className="text-sm mt-1 opacity-60">Your timetable will begin on {config.semesterStart}</p>
          </div>
        ) : todaySlots.length === 0 && extraRecords.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <CalendarDays className="mx-auto mb-3 opacity-30" size={44} />
            <p>{todayHoliday ? 'Holiday today' : 'No lectures scheduled today'}</p>
            <p className="text-sm mt-1 opacity-60">{todayHoliday ? 'Enjoy the break!' : 'Enjoy your free day!'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySlots.filter(() => semesterStarted).map(slot => {
              const mod = getModule(slot.moduleId);
              if (!mod) return null;
              const rec = getSlotRecord(slot.id);
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
                  onMark={s => markAttendance(slot, s)}
                />
              );
            })}

            {extraRecords.filter(() => semesterStarted).map(rec => {
              const mod = getModule(rec.moduleId);
              const color = mod?.color ?? '#6366F1';
              return (
                <LectureCard
                  key={rec.id}
                  name={rec.extraModuleName || mod?.name || 'Unknown'}
                  code={rec.extraCourseCode || mod?.courseCode || ''}
                  color={color}
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
          </div>
        )}

        <button
          onClick={() => setShowAddExtra(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
        >
          <Plus size={16} /> Add Extra Lecture
        </button>
      </div>

      {showAddExtra && (
        <AddExtraLectureDialog
          modules={config.modules}
          onAdd={addExtraLecture}
          onClose={() => setShowAddExtra(false)}
        />
      )}
    </div>
  );
}
