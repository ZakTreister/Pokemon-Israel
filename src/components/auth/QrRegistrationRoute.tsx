import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';

export default function QrRegistrationRoute() {
  const { isAuthenticated, isLoading, user } = useAppSelector(state => state.auth);
  const location = useLocation();
  if (isLoading) return <div className="container py-12 text-center">טוען...</div>;
  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (user?.role !== 'admin' && user?.role !== 'judge')
    return <div role="alert" className="container py-12 text-center text-destructive">אין לך הרשאה לרשום שחקנים לטורניר.</div>;
  return <Outlet />;
}
