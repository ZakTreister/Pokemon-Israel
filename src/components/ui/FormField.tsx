import type { ReactNode } from 'react';

interface FormFieldProps {
  label: ReactNode;
  htmlFor: string;
  children: ReactNode;
}

export default function FormField({
  label,
  htmlFor,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
