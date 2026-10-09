import AllStarsPlayerPage from './pages/AllStarsPlayerPage';
import NewsPage from './pages/NewsPage';
import NewsPostPage from './pages/NewsPostPage';
import ConstructionPage from './pages/ConstructionPage';
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
import { LegacyAdminRedirect } from './pages/manage/ManageDashboardPage';
import TeamPage from './pages/TeamPage';
import AllStarsPage from './pages/AllStarsPage';
import PlayerDashboardPage from './pages/player/PlayerDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import StaffRoute from './components/auth/StaffRoute';
import { ToastProvider } from './components/ui/ToastProvider';
import { ConfirmProvider } from './components/ui/ConfirmProvider';
import ManageDashboardPage from './pages/manage/ManageDashboardPage';

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  return (
    <ThemeProvider defaultTheme="light" storageKey="pokemon-tournament-theme">
      <ToastProvider>
        <ConfirmProvider>
          <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailsPage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/deck-stats" element={<DeckStatsPage />} />
          <Route path="/teams/:id" element={<TeamPage />} />
          <Route path="/all-stars/players/:playerId" element={<AllStarsPlayerPage />} />
          <Route path="/all-stars" element={<AllStarsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:id" element={<NewsPostPage />} />
          <Route path="/store" element={<ConstructionPage title="חנות" />} />
          <Route path="/about" element={<ConstructionPage title="על הליגה" />} />
          <Route path="/birthday" element={<ConstructionPage title="הזמנת יום הולדת" />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<PlayerDashboardPage />} />
          </Route>
          
          <Route element={<AdminRoute />}>
            <Route path="/admin/*" element={<LegacyAdminRedirect />} />
          </Route>
          
          <Route element={<StaffRoute />}>
            <Route path="/manage/*" element={<ManageDashboardPage />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;