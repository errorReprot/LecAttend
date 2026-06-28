import { useState } from 'react';
import { CalendarDays, CalendarRange, StickyNote, BarChart2, Settings } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { WeekView } from './WeekView';
import { NotesView } from './NotesView';
import { Statistics } from './Statistics';
import { SettingsView } from './SettingsView';
import type { AppConfig, AttendanceRecord } from '../types';
import type { Note } from '../types';

interface Props {
  config: AppConfig;
  records: AttendanceRecord[];
  notes: Note[];
  onUpdateRecords: (r: AttendanceRecord[]) => void;
  onUpdateConfig: (c: AppConfig) => void;
  onUpdateNotes: (notes: Note[]) => void;
  onReset: () => void;
}

type Tab = 'today' | 'week' | 'notes' | 'stats' | 'settings';

export function MainApp({ config, records, notes, onUpdateRecords, onUpdateConfig, onUpdateNotes, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('today');

  return (
    <div className="size-full flex flex-col bg-background">
      <div className="flex-1 overflow-auto">
        {tab === 'today' && (
          <Dashboard config={config} records={records} onUpdateRecords={onUpdateRecords} />
        )}
        {tab === 'week' && (
          <WeekView config={config} records={records} onUpdateRecords={onUpdateRecords} />
        )}
        {tab === 'notes' && <NotesView notes={notes} onUpdateNotes={onUpdateNotes} />}
        {tab === 'stats' && (
          <Statistics config={config} records={records} />
        )}
        {tab === 'settings' && (
          <SettingsView config={config} records={records} onUpdateConfig={onUpdateConfig} onUpdateRecords={onUpdateRecords} onReset={onReset} />
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 border-t border-border bg-background safe-area-pb">
        <div className="flex max-w-md mx-auto">
          <NavItem
            icon={<CalendarDays size={22} />}
            label="Today"
            active={tab === 'today'}
            onClick={() => setTab('today')}
          />
          <NavItem
            icon={<CalendarRange size={22} />}
            label="Week"
            active={tab === 'week'}
            onClick={() => setTab('week')}
          />
          <NavItem
            icon={<StickyNote size={22} />}
            label="Notes"
            active={tab === 'notes'}
            onClick={() => setTab('notes')}
          />
          <NavItem
            icon={<BarChart2 size={22} />}
            label="Stats"
            active={tab === 'stats'}
            onClick={() => setTab('stats')}
          />
          <NavItem
            icon={<Settings size={22} />}
            label="Settings"
            active={tab === 'settings'}
            onClick={() => setTab('settings')}
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      <span className="text-xs">{label}</span>
      {active && <div className="absolute bottom-0 w-1 h-1 bg-primary rounded-full" />}
    </button>
  );
}
