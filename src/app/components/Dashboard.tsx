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

  // Semester progress (only shown when both dates are set)
  const hasSemDates = config.semesterStart && config.semesterEnd;
  const semStart = hasSemDates ? new Date(config.semesterStart) : null;
  const semEnd = hasSemDates ? new Date(config.semesterEnd) : null;
  const semProgress = semStart && semEnd
    ? Math.round(Math.max(0, Math.min(1, (today.getTime() - semStart.getTime()) / Math.max(1, semEnd.getTime() - semStart.getTime()))) * 100)
    : null;

  // Quick attendance summary (filtered by semester if dates set, otherwise all)
  const allRecords = records.filter(r => {
    if (!semStart || !semEnd) return true;
    const d = new Date(r.date);
    return d >= semStart && d <= semEnd;
  });
  const attended = allRecords.filter(r => r.status === 'attended').length;
  const missed = allRecords.filter(r => r.status === 'missed').length;
  const total = attended + missed;
  const pct = total > 0 ? Math.round((attended / total) * 100) : null;

  const totalSlots = todaySlots.length + extraRecords.length;
  const markedToday = todayRecords.length;

  const todayHoliday = isHolidayDate(todayStr, config.holidays ?? []);

  return (
    <div className="min-h-full bg-background pb-4">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pt-10 pb-6">
        <div className="max-w-md mx-auto">
          <p className="text-sm opacity-70">{DAY_NAMES[todayDow]}</p>
          <h1 className="text-primary-foreground mt-0.5">
            {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h1>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs opacity-70 mb-1">
                {semProgress !== null
                  ? <span>Semester {semProgress}% complete</span>
                  : <span>No semester dates set</span>
                }
                {pct !== null && <span>{pct}% attendance</span>}
              </div>
              <div className="h-1.5 bg-white/20 rounded-full">
                <div className="h-1.5 bg-white rounded-full transition-all" style={{ width: `${semProgress ?? 0}%` }} />
              </div>
            </div>
          </div>
          {totalSlots > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${markedToday >= totalSlots ? 'bg-green-400' : 'bg-amber-400'}`} />
              <span className="text-xs opacity-80">
                {markedToday}/{totalSlots} lectures marked today
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-5">
        {/* Holiday banner */}
        {todayHoliday && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <TreePalm size={22} className="text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-orange-800" style={{ fontWeight: 600 }}>{todayHoliday.name}</p>
              <p className="text-xs text-orange-600">Holiday — no lectures today</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-foreground">Today's Schedule</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {totalSlots} lecture{totalSlots !== 1 ? 's' : ''}
          </span>
        </div>

        {todaySlots.length === 0 && extraRecords.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <CalendarDays className="mx-auto mb-3 opacity-30" size={44} />
            <p>{todayHoliday ? 'Holiday today' : 'No lectures scheduled today'}</p>
            <p className="text-sm mt-1 opacity-60">{todayHoliday ? 'Enjoy the break!' : 'Enjoy your free day!'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySlots.map(slot => {
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

            {extraRecords.map(rec => {
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

