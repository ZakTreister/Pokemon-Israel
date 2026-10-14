import { useId } from 'react';
import FormField from '../../../components/ui/FormField';
export default function PlayerNumberField({
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <FormField label="מספר שחקן" htmlFor={id} required={required}>
      <input
        id={id}
        aria-label="מספר שחקן"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="cs-player-input"
      />
    </FormField>
  );
}
