import { CheckCircle2, XCircle, MinusCircle, Trash2 } from 'lucide-react';
import type { AttendanceStatus } from '../types';
import { formatTime } from '../types';

export interface LectureCardProps {
  name: string;
  code: string;
  color: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  status?: AttendanceStatus;
  isExtra?: boolean;
  onMark: (s: AttendanceStatus) => void;
  onRemove?: () => void;
}

export function LectureCard({ name, code, color, startTime, endTime, room, status, isExtra, onMark, onRemove }: LectureCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-foreground truncate">{name}</h4>
                {isExtra && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">Extra</span>
                )}
              </div>
              {code && <p className="text-sm text-muted-foreground">{code}</p>}
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {(startTime || endTime) && (
                  <span className="text-xs text-muted-foreground">
                    {formatTime(startTime || '')}
                    {endTime ? ` – ${formatTime(endTime)}` : ''}
                  </span>
                )}
                {room && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{room}</span>}
              </div>
            </div>
            {isExtra && onRemove && (
              <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive flex-shrink-0">
                <Trash2 size={15} />
              </button>
            )}
          </div>

          {status && (
            <div className={`mt-2 mb-3 text-xs flex items-center gap-1.5 ${
              status === 'attended' ? 'text-green-600' :
              status === 'missed' ? 'text-red-500' :
              'text-yellow-600'
            }`}>
              {status === 'attended' && <CheckCircle2 size={12} />}
              {status === 'missed' && <XCircle size={12} />}
              {status === 'no_lecture' && <MinusCircle size={12} />}
              {status === 'attended' ? 'Attended' : status === 'missed' ? 'Missed' : 'No lecture'}
            </div>
          )}

          <div className="flex gap-2 flex-wrap mt-2">
            <StatusBtn active={status === 'attended'} onClick={() => onMark('attended')}
              icon={<CheckCircle2 size={13} />} label="Attended"
              activeClass="bg-green-500 text-white border-green-500"
              inactiveClass="border-green-200 text-green-700 hover:bg-green-50" />
            <StatusBtn active={status === 'missed'} onClick={() => onMark('missed')}
              icon={<XCircle size={13} />} label="Missed"
              activeClass="bg-red-500 text-white border-red-500"
              inactiveClass="border-red-200 text-red-600 hover:bg-red-50" />
            <StatusBtn active={status === 'no_lecture'} onClick={() => onMark('no_lecture')}
              icon={<MinusCircle size={13} />} label="No Lecture"
              activeClass="bg-yellow-400 text-yellow-900 border-yellow-400"
              inactiveClass="border-yellow-200 text-yellow-700 hover:bg-yellow-50" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusBtn({
  active, onClick, icon, label, activeClass, inactiveClass,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; activeClass: string; inactiveClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${active ? activeClass : inactiveClass}`}
    >
      {icon} {label}
    </button>
  );
}
