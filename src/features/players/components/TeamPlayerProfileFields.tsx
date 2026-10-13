import { useId } from 'react';
import FormField from '../../../components/ui/FormField';
export interface TeamProfileValues {
  description?: string;
  dateOfBirth?: string;
}
export default function TeamPlayerProfileFields({
  value,
  onChange,
}: {
  value: TeamProfileValues;
  onChange: (value: TeamProfileValues) => void;
}) {
  const id = useId();
  return (
    <>
      <FormField label="תיאור קצר (רשות)" htmlFor={`${id}-description`}>
        <textarea
          id={`${id}-description`}
          aria-label="תיאור קצר"
          maxLength={500}
          rows={3}
          value={value.description || ''}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className="w-full p-2 border rounded-md bg-background"
        />
      </FormField>
      <FormField
        label="תאריך לידה (רשות)"
        htmlFor={`${id}-birth`}
        description="תאריך הלידה פרטי. בעמוד הציבורי יופיע רק הגיל."
      >
        <input
          id={`${id}-birth`}
          aria-label="תאריך לידה"
          type="date"
          value={value.dateOfBirth || ''}
          onChange={(e) => onChange({ ...value, dateOfBirth: e.target.value })}
          className="w-full p-2 border rounded-md bg-background"
        />
      </FormField>
    </>
  );
}
