import type { ParticipantOption } from '../utils/participantOptions';

interface ParticipantListProps {
  options: ParticipantOption[];
  selected: string[];
  disabled: boolean;
  onChange: (selected: string[]) => void;
}

export default function ParticipantList({
  options,
  selected,
  disabled,
  onChange,
}: ParticipantListProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
      {options.map((p) => (
        <label key={p.id} className="border rounded-md p-2">
          <input
            type="checkbox"
            disabled={disabled}
            checked={selected.includes(p.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selected, p.id]
                  : selected.filter((value) => value !== p.id),
              )
            }
          />{' '}
          {p.label}
        </label>
      ))}
    </div>
  );
}
