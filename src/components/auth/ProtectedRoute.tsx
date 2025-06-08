import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  // If still loading auth state, show nothing or a loader
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[300px]">טוען...</div>;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render children
  return <Outlet />;
}