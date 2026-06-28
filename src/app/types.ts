export const MODULE_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  '#A855F7', '#F43F5E',
];

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface Module {
  id: string;
  name: string;
  courseCode: string;
  color: string;
}

export interface TimetableSlot {
  id: string;
  moduleId: string;
  dayOfWeek: number; // 0=Monday, 6=Sunday
  startTime: string; // "09:00"
  endTime: string;
  room?: string;
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // same as startDate for single day
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfig {
  semesterStart: string; // "YYYY-MM-DD"
  semesterEnd: string;
  modules: Module[];
  timetable: TimetableSlot[];
  holidays: Holiday[];
}

export const NOTE_COLORS = [
  '#FEF9C3', '#DCFCE7', '#DBEAFE', '#F3E8FF', '#FFE4E6', '#FFEDD5',
];

export function isHolidayDate(dateStr: string, holidays: Holiday[]): Holiday | null {
  return holidays.find(h => dateStr >= h.startDate && dateStr <= h.endDate) ?? null;
}

export type AttendanceStatus = 'attended' | 'missed' | 'no_lecture';

export interface AttendanceRecord {
  id: string;
  date: string; // "YYYY-MM-DD"
  moduleId: string;
  slotId: string;
  status: AttendanceStatus;
  isExtra?: boolean;
  extraModuleName?: string;
  extraCourseCode?: string;
  extraStartTime?: string;
  extraEndTime?: string;
  extraRoom?: string;
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayDayOfWeek(): number {
  // JS: 0=Sun, 1=Mon...; we want 0=Mon, 6=Sun
  return (new Date().getDay() + 6) % 7;
}

export function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}
