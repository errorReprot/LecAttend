import type { AppConfig, AttendanceRecord } from '../types';
import { DAY_SHORT } from '../types';

interface DayDatum { day: string; attended: number; missed: number; slots: number; }

function DayBarChart({ data }: { data: DayDatum[] }) {
  const maxVal = Math.max(...data.map(d => d.attended + d.missed), 1);
  const chartH = 100;
  const barW = 18;
  const gap = 8;
  const groupW = barW * 2 + gap;
  const totalW = data.length * (groupW + 16);

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={chartH + 24} style={{ minWidth: '100%' }}>
        {data.map((d, i) => {
          const x = i * (groupW + 16) + 8;
          const aH = Math.round((d.attended / maxVal) * chartH);
          const mH = Math.round((d.missed / maxVal) * chartH);
          const cx = x + groupW / 2;
          return (
            <g key={`day-group-${i}`}>
              {/* attended bar */}
              <rect
                x={x}
                y={chartH - aH}
                width={barW}
                height={aH}
                fill="#22C55E"
                rx={3}
              />
              {/* missed bar */}
              <rect
                x={x + barW + gap}
                y={chartH - mH}
                width={barW}
                height={mH}
                fill="#EF4444"
                rx={3}
              />
              {/* day label */}
              <text
                x={cx}
                y={chartH + 16}
                textAnchor="middle"
                fontSize={11}
                fill="#717182"
              >
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface Props {
  config: AppConfig;
  records: AttendanceRecord[];
}

export function Statistics({ config, records }: Props) {
  const semStart = config.semesterStart ? new Date(config.semesterStart) : null;
  const semEnd = config.semesterEnd ? new Date(config.semesterEnd) : null;

  const semRecords = records.filter(r => {
    if (!semStart && !semEnd) return true;
    const d = new Date(r.date);
    if (semStart && d < semStart) return false;
    if (semEnd && d > semEnd) return false;
    return true;
  });

  const attended = semRecords.filter(r => r.status === 'attended').length;
  const missed = semRecords.filter(r => r.status === 'missed').length;
  const noLecture = semRecords.filter(r => r.status === 'no_lecture').length;
  const total = attended + missed;
  const overallPct = total > 0 ? Math.round((attended / total) * 100) : null;

  // Per-module stats
  const moduleStats = config.modules.map(mod => {
    const modRecs = semRecords.filter(r => r.moduleId === mod.id);
    const a = modRecs.filter(r => r.status === 'attended').length;
    const m = modRecs.filter(r => r.status === 'missed').length;
    const t = a + m;
    const pct = t > 0 ? Math.round((a / t) * 100) : null;
    return { ...mod, attended: a, missed: m, total: t, pct };
  }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  // Per-day breakdown
  const dayData = DAY_SHORT.map((day, i) => {
    const daySlots = config.timetable.filter(s => s.dayOfWeek === i);
    const dayRecs = semRecords.filter(r => {
      const d = new Date(r.date);
      return (d.getDay() + 6) % 7 === i;
    });
    const a = dayRecs.filter(r => r.status === 'attended').length;
    const m = dayRecs.filter(r => r.status === 'missed').length;
    return { day, attended: a, missed: m, slots: daySlots.length };
  }).filter(d => d.slots > 0);

  const pctColor = (p: number | null) => {
    if (p === null) return '#94a3b8';
    if (p >= 75) return '#22C55E';
    if (p >= 60) return '#EAB308';
    return '#EF4444';
  };

  return (
    <div className="min-h-full bg-background pb-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-orange-600 to-orange-500 text-primary-foreground px-4 pt-10 pb-6 shadow-lg shadow-orange-500/20">
        <div className="max-w-md mx-auto">
          <h1 className="text-primary-foreground">Attendance Statistics</h1>
          <p className="text-sm opacity-70 mt-1">
            {config.semesterStart || config.semesterEnd
              ? `${config.semesterStart || 'Start not set'}${config.semesterEnd ? ` – ${config.semesterEnd}` : ''}`
              : 'All time'}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-5 space-y-5">
        {/* Overall card */}
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-muted-foreground text-sm mb-3">Overall Attendance</h2>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-5xl text-foreground" style={{ fontWeight: 700, lineHeight: 1 }}>
                {overallPct !== null ? `${overallPct}%` : '–'}
              </p>
              <p className="text-xs text-muted-foreground mt-1" style={{ color: pctColor(overallPct) }}>
                {overallPct !== null
                  ? overallPct >= 75 ? 'Good standing' : overallPct >= 60 ? 'Needs improvement' : 'Critical — attend more!'
                  : 'No data yet'}
              </p>
            </div>
            <div className="flex-1">
              {overallPct !== null && (
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{ width: `${overallPct}%`, backgroundColor: pctColor(overallPct) }}
                  />
                </div>
              )}
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{attended} attended</span>
                <span>{missed} missed</span>
                {noLecture > 0 && <span>{noLecture} cancelled</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Day chart */}
        {dayData.length > 0 && (
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl p-4 shadow-sm">
            <h2 className="text-muted-foreground text-sm mb-1">By Day of Week</h2>
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-green-500" /> Attended</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-red-500" /> Missed</span>
            </div>
            <DayBarChart data={dayData} />
          </div>
        )}

        {/* Per-module */}
        <div>
          <h2 className="text-foreground mb-3">By Module</h2>
          {moduleStats.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">No modules configured</p>
          ) : (
            <div className="space-y-3">
              {moduleStats.map(mod => (
                <div key={mod.id} className="bg-card/90 backdrop-blur-sm border border-border rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: mod.color }} />
                      <div className="min-w-0">
                        <p className="text-foreground truncate">{mod.name}</p>
                        {mod.courseCode && <p className="text-xs text-muted-foreground">{mod.courseCode}</p>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm" style={{ color: pctColor(mod.pct), fontWeight: 600 }}>
                        {mod.pct !== null ? `${mod.pct}%` : '–'}
                      </p>
                      <p className="text-xs text-muted-foreground">{mod.attended}/{mod.total}</p>
                    </div>
                  </div>
                  {mod.total > 0 && (
                    <div className="mt-2.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${mod.pct}%`, backgroundColor: pctColor(mod.pct) }}
                      />
                    </div>
                  )}
                  {mod.total === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">No records yet</p>
                  )}
                  {mod.total > 0 && mod.pct !== null && mod.pct < 75 && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      Need {Math.ceil((0.75 * mod.total - mod.attended) / (1 - 0.75))} more attendances to reach 75%
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
