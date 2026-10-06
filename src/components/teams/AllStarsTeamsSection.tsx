import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicTeams } from "../../services/publicTeams";
import type { Team } from "../../types/team";
import TeamCard from "./TeamCard";
import { SectionHeading } from "../ui/SectionHeading";
import { Shield } from "lucide-react";
import { requestError } from "../../utils/requestError";
export default function AllStarsTeamsSection() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    publicTeams
      .list()
      .then((data) => {
        if (active) setTeams(data.slice(0, 4));
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="container py-14">
      <SectionHeading
        icon={<Shield size={22} />}
        title="נבחרות All Stars"
        subtitle="הנבחרות, הסגלים והפעילות הפנימית של הליגה"
      />
      <Link to="/all-stars" className="block mb-5 font-bold text-blue-500">
        לכל הנבחרות והדירוגים ←
      </Link>
      {error ? (
        <p role="alert">{error}</p>
      ) : teams === null ? (
        <p>טוען נבחרות...</p>
      ) : !teams.length ? (
        <p className="text-muted-foreground">נבחרות יופיעו כאן לאחר פתיחתן.</p>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </section>
  );
}
