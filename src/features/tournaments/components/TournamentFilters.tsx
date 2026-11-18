import {
  tournamentTypes,
  tournamentStatuses,
  type TournamentFiltersValue,
} from '../../../../shared/tournamentDomain';

interface Props {
  value: TournamentFiltersValue;
  onChange: (value: TournamentFiltersValue) => void;
  hideType?: boolean;
  buttonMode?: boolean;
}

export default function TournamentFilters({
  value,
  onChange,
  hideType = false,
  buttonMode = false,
}: Props) {
  const filterButtons = (
    field: 'status' | 'type',
    options: Record<string, string>,
    allLabel: string,
  ) => (
    <div className="flex flex-wrap gap-2" role="group" aria-label={field === 'status' ? 'מצב טורניר' : 'סוג טורניר'}>
      {[[ '', allLabel ], ...Object.entries(options)].map(([option, label]) => {
        const active = value[field] === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold min-h-10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
            onClick={() => onChange({ ...value, [field]: option })}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
  return (
    <div className={buttonMode ? 'space-y-4' : `grid gap-3 ${hideType ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
      <label className="block">
        חיפוש טורנירים
        <input
          aria-label="חיפוש טורנירים"
          className="block w-full p-2 border rounded-md bg-background"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </label>
      {buttonMode ? (
        <>
          <div className="space-y-2">
            <p className="text-sm font-bold">מצב</p>
            {filterButtons('status', tournamentStatuses, 'כל המצבים')}
          </div>
          {!hideType && <div className="space-y-2">
            <p className="text-sm font-bold">סוג טורניר</p>
            {filterButtons('type', tournamentTypes, 'כל הסוגים')}
          </div>}
        </>
      ) : (
        <>
          <label>
            מצב
            <select
              aria-label="מצב טורניר"
              className="block w-full p-2 border rounded-md bg-background"
              value={value.status}
              onChange={(e) => onChange({ ...value, status: e.target.value })}
            >
              <option value="">כל המצבים</option>
              {Object.entries(tournamentStatuses).map(([option, label]) => (
                <option key={option} value={option}>{label}</option>
              ))}
            </select>
          </label>
          {!hideType && <label>
            סוג טורניר
            <select
              aria-label="סוג טורניר"
              className="block w-full p-2 border rounded-md bg-background"
              value={value.type}
              onChange={(e) => onChange({ ...value, type: e.target.value })}
            >
              <option value="">כל הסוגים</option>
              {Object.entries(tournamentTypes).map(([option, label]) => (
                <option key={option} value={option}>{label}</option>
              ))}
            </select>
          </label>}
        </>
      )}
    </div>
  );
}
