import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppDispatch } from './hooks/redux';
import { checkAuth } from './features/auth/authSlice';
import { ThemeProvider } from './components/ThemeProvider';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailsPage from './pages/TournamentDetailsPage';
import RankingsPage from './pages/RankingsPage';
import DeckStatsPage from './pages/DeckStatsPage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import PlayerDashboardPage from './pages/player/PlayerDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  return (
    <ThemeProvider defaultTheme="light" storageKey="pokemon-tournament-theme">
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailsPage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/deck-stats" element={<DeckStatsPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<PlayerDashboardPage />} />
          </Route>
          
          <Route element={<AdminRoute />}>
            <Route path="/admin/*" element={<AdminDashboardPage />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}

export default App;