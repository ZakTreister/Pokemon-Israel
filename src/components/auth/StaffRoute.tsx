import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';

export default function StaffRoute() {
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[300px]">טוען...</div>;
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'judge')) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
