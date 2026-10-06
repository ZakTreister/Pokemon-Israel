import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useAppSelector } from "../../hooks/redux";
import ManageTeams from "./ManageTeams";
import ManageBadges from "./ManageBadges";
import AdminTournaments from "../admin/AdminTournaments";
import AdminUsers from "../admin/AdminUsers";
import AdminOverview from "../admin/AdminOverview";
import AdminUpdates from "../admin/AdminUpdates";
import AdminDecks from "../admin/AdminDecks";
import AdminSeasons from "../admin/AdminSeasons";
import AdminPlayers from "../admin/AdminPlayers";
import InternalTournamentPage from "./InternalTournamentPage";
import InternalTournamentsPage from "./InternalTournamentsPage";
import HistoricalTournamentPage from "./HistoricalTournamentPage";

export function LegacyAdminRedirect() {
  const location = useLocation();
  return (
    <Navigate
      replace
      to={`${location.pathname.replace(/^\/admin/, "/manage")}${location.search}${location.hash}`}
    />
  );
}
export default function ManageDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const admin = user?.role === "admin";
  const links = [
    ["teams", "נבחרות וסגלים"],
    ["internal-tournaments", "טורנירים פנימיים"],
    ["historical", "הזנת טורניר היסטורי"],
    ...(admin
      ? [
          ["", "סקירה כללית"],
          ["tournaments", "טורנירים רגילים"],
          ["players", "שחקנים"],
          ["users", "משתמשים"],
          ["updates", "עדכונים"],
          ["decks", "דקים"],
          ["seasons", "עונות"],
          ["badges", "תגים"],
        ]
      : []),
  ];
  return (
    <div className="cs-workspace">
      <div className="container py-6">
        <h1 className="text-3xl font-extrabold mb-6">ניהול</h1>
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="ניהול"
            className="bg-card border rounded-lg p-3 h-fit shadow-panel"
          >
            <p className="font-bold p-3 border-b mb-2">
              {user?.name} · {admin ? "מנהל" : "שופט"}
            </p>
            {links.map(([path, label]) => (
              <NavLink
                key={path}
                end={!path}
                to={`/manage/${path}`}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md font-bold ${isActive ? "bg-navy-700 text-white border-s-4 border-gold" : "hover:bg-muted"}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="min-w-0 bg-card border rounded-lg p-4 sm:p-6 shadow-panel">
            <Routes>
              <Route
                index
                element={
                  admin ? <AdminOverview /> : <Navigate replace to="teams" />
                }
              />
              <Route path="teams/*" element={<ManageTeams />} />
              <Route
                path="internal-tournaments"
                element={<InternalTournamentsPage />}
              />
              <Route
                path="internal-tournaments/:id"
                element={<InternalTournamentPage />}
              />
              <Route path="historical" element={<HistoricalTournamentPage />} />
              {admin && (
                <>
                  <Route path="tournaments/*" element={<AdminTournaments />} />
                  <Route path="users/*" element={<AdminUsers />} />
                  <Route path="updates/*" element={<AdminUpdates />} />
                  <Route path="decks/*" element={<AdminDecks />} />
                  <Route path="seasons/*" element={<AdminSeasons />} />
                  <Route path="players/*" element={<AdminPlayers />} />
                  <Route path="badges/*" element={<ManageBadges />} />
                </>
              )}
              <Route
                path="*"
                element={<Navigate replace to="/manage/teams" />}
              />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
