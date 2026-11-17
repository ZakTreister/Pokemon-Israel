import { useId } from 'react';
import FormField from '../../../components/ui/FormField';

interface PlayerNameFieldsProps {
  firstName: string;
  lastName: string;
  onChange: (field: 'firstName' | 'lastName', value: string) => void;
  lastNameOptional?: boolean;
}

export default function PlayerNameFields({
  firstName,
  lastName,
  onChange,
  lastNameOptional = false,
}: PlayerNameFieldsProps) {
  const id = useId();
  return (
    <>
      <FormField label="שם פרטי *" htmlFor={`${id}-first`}>
        <input
          id={`${id}-first`}
          type="text"
          className="cs-player-input"
          value={firstName}
          onChange={(e) => onChange('firstName', e.target.value)}
        />
      </FormField>
      <FormField label={lastNameOptional ? "שם משפחה (ניתן להשלים בהמשך)" : "שם משפחה *"} htmlFor={`${id}-last`}>
        <input
          id={`${id}-last`}
          type="text"
          className="cs-player-input"
          value={lastName}
          onChange={(e) => onChange('lastName', e.target.value)}
        />
      </FormField>
    </>
  );
}
