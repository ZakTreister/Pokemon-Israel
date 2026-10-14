import TeamPlayerProfileFields, {
  type TeamProfileValues,
} from './TeamPlayerProfileFields';
import { useId, type ReactNode } from 'react';
import PlayerNameFields from './PlayerNameFields';
import PlayerNumberField from './PlayerNumberField';
import FormField from '../../../components/ui/FormField';
export interface TeamPlayerValues extends TeamProfileValues {
  firstName: string;
  lastName: string;
  city: string;
  playerNumber: string;
}
export default function TeamPlayerFields({
  value,
  onChange,
  newPlayer = false,
  children,
}: {
  value: TeamPlayerValues;
  onChange: (value: TeamPlayerValues) => void;
  newPlayer?: boolean;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <>
      <PlayerNameFields
        firstName={value.firstName}
        lastName={value.lastName}
        onChange={(field, text) => onChange({ ...value, [field]: text })}
      />
      <FormField label="עיר (רשות)" htmlFor={id}>
        <input
          id={id}
          value={value.city}
          maxLength={100}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          className="cs-player-input"
        />
      </FormField>
      <PlayerNumberField
        value={value.playerNumber}
        required={newPlayer}
        onChange={(playerNumber) => onChange({ ...value, playerNumber })}
      />
      {children}
      <TeamPlayerProfileFields
        value={value}
        onChange={(profile) => onChange({ ...value, ...profile })}
      />
    </>
  );
}
