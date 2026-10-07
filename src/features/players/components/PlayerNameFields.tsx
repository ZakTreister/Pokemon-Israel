import { useId } from 'react';
import FormField from '../../../components/ui/FormField';

interface PlayerNameFieldsProps {
  firstName: string;
  lastName: string;
  onChange: (field: 'firstName' | 'lastName', value: string) => void;
}

export default function PlayerNameFields({
  firstName,
  lastName,
  onChange,
}: PlayerNameFieldsProps) {
  const id = useId();
  return (
    <>
      <FormField label="שם פרטי *" htmlFor={`${id}-first`}>
        <input
          id={`${id}-first`}
          type="text"
          className="w-full px-3 py-2 border border-input rounded-md bg-background"
          value={firstName}
          onChange={(e) => onChange('firstName', e.target.value)}
        />
      </FormField>
      <FormField label="שם משפחה *" htmlFor={`${id}-last`}>
        <input
          id={`${id}-last`}
          type="text"
          className="w-full px-3 py-2 border border-input rounded-md bg-background"
          value={lastName}
          onChange={(e) => onChange('lastName', e.target.value)}
        />
      </FormField>
    </>
  );
}
