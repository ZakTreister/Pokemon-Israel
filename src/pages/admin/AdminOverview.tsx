import { useEffect, useState } from 'react';
import {
  getOverview,
  type AdminOverviewSummary,
} from '../../features/overview/overviewService';
import { AdminIndicators } from '../../features/overview/components/OverviewIndicators';
import { requestError } from '../../utils/requestError';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminOverview() {
  const [summary, setSummary] = useState<AdminOverviewSummary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getOverview()
      .then((data) => {
        if (active && data.role === 'admin') setSummary(data);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const isLoading = !summary && !error;
  const nearestTournament = summary?.nearest;
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-foreground mb-6">
        סקירה כללית
      </h2>

      {error && <p role="alert">{error}</p>}
      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען נתונים...</div>
      ) : summary ? (
        <>
          {summary && <AdminIndicators summary={summary} />}
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays size={20} />
                  <span>טורניר קרוב</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nearestTournament ? (
                  <div>
                    <h3 className="font-medium text-lg mb-2">
                      {nearestTournament.title}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">תאריך:</span>
                        <span>
                          {new Date(nearestTournament.date).toLocaleDateString(
                            'he-IL',
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">מיקום:</span>
                        <span>{nearestTournament.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">משתתפים:</span>
                        <span>
                          {nearestTournament.currentParticipants} /{' '}
                          {nearestTournament.maxParticipants}
                        </span>
                      </div>
                      <div className="pt-3">
                        <Link
                          to={nearestTournament.managementPath}
                          className="text-blue-500 hover:underline font-bold"
                        >
                          ניהול הטורניר
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">אין טורנירים קרובים</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
