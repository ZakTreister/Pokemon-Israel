import {
  tournamentTypes,
  tournamentStatuses,
  type TournamentFiltersValue,
} from '../../../../shared/tournamentDomain';
export default function TournamentFilters({
  value,
  onChange,
}: {
  value: TournamentFiltersValue;
  onChange: (value: TournamentFiltersValue) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label>
        חיפוש טורנירים
        <input
          aria-label="חיפוש טורנירים"
          className="block w-full p-2 border rounded-md bg-background"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </label>
      <label>
        מצב
        <select
          aria-label="מצב טורניר"
          className="block w-full p-2 border rounded-md bg-background"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
        >
          <option value="">כל המצבים</option>
          {Object.entries(tournamentStatuses).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        סוג טורניר
        <select
          aria-label="סוג טורניר"
          className="block w-full p-2 border rounded-md bg-background"
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value })}
        >
          <option value="">כל הסוגים</option>
          {Object.entries(tournamentTypes).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
