import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface ActiveMeeting {
  id: string;
  title: string;
  phase: 'setup' | 'running';
  teamNames: string[];
  roundNumber: number;
}

/** Open inter-team meetings stay on the staff dashboard until closed. */
export default function ActiveInterTeamMeetings() {
  const [meetings, setMeetings] = useState<ActiveMeeting[]>([]);
  useEffect(() => {
    let active = true;
    const load = () => {
      void api.get<ActiveMeeting[]>('/api/inter-team/active')
        .then(({data}) => { if(active) setMeetings(data); })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load,30000);
    return () => { active=false; window.clearInterval(timer); };
  },[]);
  if(!meetings.length)return null;
  return <section className="mb-6 space-y-3" aria-label="מפגשי נבחרות בתהליך" dir="rtl">
    <h2 className="text-xl font-bold">מפגשי נבחרות בתהליך</h2>
    <div className="grid gap-3">
      {meetings.map(meeting => <Link
        key={meeting.id}
        to={`/manage/inter-team/${meeting.id}`}
        className="flex flex-wrap items-center gap-3 rounded-lg border p-4 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {meeting.phase==='running'
          ? <span className="h-3 w-3 rounded-full bg-red-600 animate-pulse" aria-label="LIVE"/>
          : <span className="h-3 w-3 rounded-full bg-amber-500" aria-label="בהכנה"/>}
        <span className="font-bold">{meeting.teamNames.join(' מול ')||meeting.title}</span>
        <span className="text-sm text-muted-foreground">
          {meeting.phase==='running'?`סבב ${meeting.roundNumber} · בעיצומו`:'בהכנה'}
        </span>
        <span className="text-sm font-semibold ms-auto">פתח ניהול ←</span>
      </Link>)}
    </div>
  </section>;
}
