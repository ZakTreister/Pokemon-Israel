import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';

export default function AdminRoute() {
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);

  // If still loading auth state, show nothing or a loader
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[300px]">טוען...</div>;
  }

  // If not authenticated or not admin, redirect to home
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // If authenticated and admin, render children
  return <Outlet />;
}