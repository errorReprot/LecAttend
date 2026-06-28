import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { SetupWizard } from './components/SetupWizard';
import { MainApp } from './components/MainApp';
import type { AppConfig, AttendanceRecord } from './types';
import type { Note } from './types';
import { hasSupabaseConfig, supabase } from './lib/supabase';

const CONFIG_KEY = 'att_config';
const RECORDS_KEY = 'att_records';
const NOTES_KEY = 'att_notes';
const DEVICE_ID_KEY = 'att_device_id';

type StoredState = {
  config: AppConfig | null;
  records: AttendanceRecord[];
  notes: Note[];
};

function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function loadLocalState(): StoredState {
  try {
    const configRaw = localStorage.getItem(CONFIG_KEY);
    const recordsRaw = localStorage.getItem(RECORDS_KEY);
    const notesRaw = localStorage.getItem(NOTES_KEY);
    const config = configRaw ? JSON.parse(configRaw) as AppConfig : null;
    if (config && !config.holidays) config.holidays = [];
    return {
      config,
      records: recordsRaw ? JSON.parse(recordsRaw) : [],
      notes: notesRaw ? JSON.parse(notesRaw) : [],
    };
  } catch {
    return { config: null, records: [], notes: [] };
  }
}

async function loadRemoteState(deviceId: string): Promise<StoredState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('app_state')
    .select('config, records, notes')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    config: data.config ?? null,
    records: Array.isArray(data.records) ? data.records : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
  };
}

async function saveRemoteState(deviceId: string, state: StoredState): Promise<void> {
  if (!supabase) return;
  await supabase.from('app_state').upsert({
    device_id: deviceId,
    config: state.config,
    records: state.records,
    notes: state.notes,
    updated_at: new Date().toISOString(),
  });
}

async function clearRemoteState(deviceId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('app_state').delete().eq('device_id', deviceId);
}

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deviceId] = useState(() => getDeviceId());

  useEffect(() => {
    let active = true;

    (async () => {
      const localState = loadLocalState();
      const remoteState = hasSupabaseConfig ? await loadRemoteState(deviceId) : null;
      const nextState = remoteState ?? localState;

      if (!active) return;
      setConfig(nextState.config);
      setRecords(nextState.records);
      setNotes(nextState.notes);
      setLoaded(true);

      if (remoteState) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(remoteState.config));
        localStorage.setItem(RECORDS_KEY, JSON.stringify(remoteState.records));
        localStorage.setItem(NOTES_KEY, JSON.stringify(remoteState.notes));
      }
    })();

    return () => { active = false; };
  }, []);

  const persistState = (nextState: StoredState) => {
    if (nextState.config) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(nextState.config));
    } else {
      localStorage.removeItem(CONFIG_KEY);
    }
    localStorage.setItem(RECORDS_KEY, JSON.stringify(nextState.records));
    localStorage.setItem(NOTES_KEY, JSON.stringify(nextState.notes));
    void saveRemoteState(deviceId, nextState);
  };

  const handleConfig = (c: AppConfig) => {
    persistState({ config: c, records, notes });
    setConfig(c);
  };

  const handleRecords = (r: AttendanceRecord[]) => {
    persistState({ config, records: r, notes });
    setRecords(r);
  };

  const handleNotes = (n: Note[]) => {
    persistState({ config, records, notes: n });
    setNotes(n);
  };

  const handleReset = () => {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(NOTES_KEY);
    void clearRemoteState(deviceId);
    setConfig(null);
    setRecords([]);
    setNotes([]);
  };

  if (!loaded) {
    return (
      <div className="size-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="size-full">
      {!config ? (
        <SetupWizard onComplete={handleConfig} />
      ) : (
        <MainApp
          config={config}
          records={records}
          notes={notes}
          onUpdateRecords={handleRecords}
          onUpdateConfig={handleConfig}
          onUpdateNotes={handleNotes}
          onReset={handleReset}
        />
      )}
      <Toaster position="top-center" richColors />
    </div>
  );
}
