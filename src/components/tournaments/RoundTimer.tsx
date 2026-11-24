import { useCallback, useEffect, useState } from 'react';
import { Maximize2, Minimize2, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import Button from '../ui/Button';
import { requestError } from '../../utils/requestError';
import {
  roundTimerApi,
  type RoundTimerNotification,
  type RoundTimerSnapshot,
} from '../../services/roundTimer';

interface SyncedSnapshot extends RoundTimerSnapshot { offsetMs: number }

interface RoundTimerProps {
  tournamentId: string;
  roundNumber: number;
  endpoint: string;
  notification?: RoundTimerNotification | null;
}

const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rem = total % 60;
  const two = (number: number) => String(number).padStart(2, '0');
  return hours
    ? `${two(hours)}:${two(minutes)}:${two(rem)}`
    : `${two(Math.floor(total / 60))}:${two(rem)}`;
};

export default function RoundTimer({
  tournamentId, roundNumber, endpoint, notification,
}: RoundTimerProps) {
  const [snapshot, setSnapshot] = useState<SyncedSnapshot | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [minutes, setMinutes] = useState(50);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [full, setFull] = useState(false);

  const receive = useCallback((value: RoundTimerSnapshot) => {
    if (value.roundNumber !== roundNumber) return;
    const incoming = {
      ...value,
      offsetMs: Date.parse(value.serverTime) - Date.now(),
    };
    setSnapshot(current =>
      current && current.timer.version > incoming.timer.version ? current : incoming);
  }, [roundNumber]);

  const refresh = useCallback(async () => {
    try {
      const latest = await roundTimerApi.get(endpoint);
      receive(latest);
      setError('');
    } catch (err) {
      setError(requestError(err));
    }
  }, [endpoint, receive]);

  useEffect(() => {
    // The timer also reconciles via HTTP on reconnect or missed socket updates.
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (notification?.id === tournamentId && notification.roundNumber === roundNumber)
      receive(notification);
  }, [notification, tournamentId, roundNumber, receive]);

  useEffect(() => {
    if (!snapshot) return;
    setMinutes(Math.floor(snapshot.timer.durationSeconds / 60));
    setSeconds(snapshot.timer.durationSeconds % 60);
  }, [snapshot?.timer.version, snapshot?.timer.durationSeconds]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!full) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFull(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [full]);

  const timer = snapshot?.timer;
  const elapsed = timer?.status === 'running' && timer.startedAt
    ? Math.max(0, (now + (snapshot?.offsetMs ?? 0) - Date.parse(timer.startedAt)) / 1000)
    : 0;
  const remaining = Math.max(0, (timer?.remainingSeconds ?? 0) - elapsed);
  const finished = !!timer && remaining <= 0;
  const status = finished ? 'הזמן הסתיים' :
    timer?.status === 'running' ? 'הטיימר פועל' :
    timer?.status === 'paused' ? 'מושהה' : 'מוכן להפעלה';
  const duration = minutes * 60 + seconds;
  const validDuration = Number.isInteger(duration) && minutes >= 0 &&
    minutes <= 180 && seconds >= 0 && seconds < 60 &&
    duration >= 1 && duration <= 10800;
  const changed = !!timer && timer.durationSeconds !== duration;
  const color = finished || remaining <= 60 ? 'text-red-500' :
    remaining <= 300 ? 'text-amber-500' : full ? 'text-white' : 'text-slate-900';

  const action = async (
    type: 'start' | 'pause' | 'reset' | 'configure',
    nextDuration?: number,
  ) => {
    if (!timer || busy) return;
    setBusy(true);
    setError('');
    try {
      receive(await roundTimerApi.update(endpoint, timer.version, type, nextDuration));
    } catch (err) {
      setError(requestError(err));
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      dir="rtl"
      role={full ? 'dialog' : undefined}
      aria-modal={full || undefined}
      aria-label={`טיימר סבב ${roundNumber}`}
      className={full
        ? 'fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 overflow-y-auto bg-slate-950 p-5 text-white sm:p-8'
        : 'space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm'}
    >
      <div className={full ? 'flex w-full max-w-6xl items-center justify-between' : 'flex items-center justify-between gap-3'}>
        <h3 className={full ? 'flex items-center gap-2 text-xl font-bold sm:text-3xl' : 'flex items-center gap-2 font-bold'}>
          <Timer aria-hidden="true" /> טיימר סבב {roundNumber}
        </h3>
        <Button type="button" variant="outline" size="icon"
          className={full ? 'border-slate-400 bg-slate-900 text-white hover:bg-slate-800' : ''}
          title={full ? 'צא ממסך מלא' : 'הגדל טיימר למסך מלא'}
          aria-label={full ? 'צמצם טיימר' : 'הגדל טיימר למסך מלא'}
          onClick={() => setFull(value => !value)}>
          {full ? <Minimize2 aria-hidden="true" size={20} /> : <Maximize2 aria-hidden="true" size={20} />}
        </Button>
      </div>

      <div className={full ? 'w-full max-w-6xl text-center' : 'text-center'}>
        <div dir="ltr" role="timer"
          className={`font-mono font-extrabold tracking-tight tabular-nums ${full ? 'text-[clamp(4.5rem,18vw,17rem)]' : 'text-5xl sm:text-7xl'} ${color}`}>
          {timer ? formatTime(remaining) : '—:—'}
        </div>
        <p className={full ? 'mt-2 text-xl font-bold sm:text-3xl' : 'text-sm font-semibold'}>{timer ? status : 'טוען טיימר…'}</p>
        {timer && <div aria-hidden="true" className={full ? 'mx-auto mt-6 h-3 max-w-4xl overflow-hidden rounded-full bg-slate-700' : 'mx-auto mt-3 h-2 max-w-2xl overflow-hidden rounded-full bg-slate-200'}>
          <div className={`h-full rounded-full transition-[width] ${finished ? 'bg-red-500' : remaining <= 300 ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{width: `${Math.min(100, (remaining / timer.durationSeconds) * 100)}%`}}/>
        </div>}
      </div>

      {timer && <div className="flex flex-wrap items-center justify-center gap-2">
        {timer.status === 'running' ? (
          <Button type="button" disabled={busy} onClick={() => void action('pause')}>
            <Pause size={17} aria-hidden="true" className="ml-2" /> עצור
          </Button>
        ) : (
          <Button type="button" disabled={busy || finished} onClick={() => void action('start')}>
            <Play size={17} aria-hidden="true" className="ml-2" /> הפעל
          </Button>
        )}
        <Button type="button" disabled={busy || timer.status === 'running'}
          variant="outline" className={full ? 'border-slate-400 bg-slate-900 text-white hover:bg-slate-800' : ''}
          onClick={() => void action('reset')}>
          <RotateCcw size={17} aria-hidden="true" className="ml-2" /> איפוס
        </Button>
      </div>}

      {timer && <div className={full ? 'flex flex-wrap items-center justify-center gap-3' : 'flex flex-wrap items-center justify-center gap-2 border-t pt-3'}>
        <span className="text-sm font-semibold">משך הסבב:</span>
        <label className="flex items-center gap-1 text-sm">
          <input type="number" min={0} max={180} step={1} value={minutes}
            disabled={busy || timer.status === 'running'} onChange={e => setMinutes(Number(e.target.value))}
            aria-label="דקות" className="w-16 rounded-md border border-slate-300 bg-white p-2 text-center text-slate-900" />
          דקות
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="number" min={0} max={59} step={1} value={seconds}
            disabled={busy || timer.status === 'running'} onChange={e => setSeconds(Number(e.target.value))}
            aria-label="שניות" className="w-16 rounded-md border border-slate-300 bg-white p-2 text-center text-slate-900" />
          שניות
        </label>
        <Button type="button" variant="outline" disabled={busy || timer.status === 'running' || !validDuration || !changed}
          className={full ? 'border-slate-400 bg-slate-900 text-white hover:bg-slate-800' : ''}
          onClick={() => void action('configure', duration)}>עדכן זמן</Button>
      </div>}
      <p className={full ? 'text-center text-sm text-slate-300' : 'text-center text-xs text-slate-500'}>
        הטיימר מתחיל רק בלחיצה על הפעל. סיום הזמן אינו מסיים את הסבב.
      </p>
      {error && <p role="alert" className={full ? 'text-red-300' : 'text-sm text-red-700'}>{error}</p>}
    </section>
  );
}
