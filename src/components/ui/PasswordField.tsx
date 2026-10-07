import { useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import FormField from './FormField';

interface PasswordFieldProps {
  label: string;
  placeholder: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}

export default function PasswordField({
  label,
  placeholder,
  value,
  visible,
  onChange,
  onToggle,
}: PasswordFieldProps) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="w-full px-3 py-2 border border-input rounded-md pr-10"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground"
          onClick={onToggle}
          aria-label={visible ? 'הסתר סיסמה' : 'הצג סיסמה'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </FormField>
  );
}
