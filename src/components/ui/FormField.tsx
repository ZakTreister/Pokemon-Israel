import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type AriaAttributes,
  type ReactNode,
} from 'react';

interface FormFieldProps {
  label: ReactNode;
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  description?: ReactNode;
  error?: string;
}

export default function FormField({
  label,
  htmlFor,
  children,
  required = false,
  description,
  error,
}: FormFieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
        {label}
        {required && ' *'}
      </label>
      {Children.map(children, (child) => {
        if (
          !isValidElement<AriaAttributes>(child) ||
          typeof child.type !== 'string' ||
          !['input', 'select', 'textarea'].includes(child.type)
        )
          return child;
        const describedBy = [
          child.props['aria-describedby'],
          descriptionId,
          errorId,
        ]
          .filter(Boolean)
          .join(' ');
        return cloneElement(child, {
          'aria-describedby': describedBy || undefined,
          'aria-invalid': error ? true : child.props['aria-invalid'],
        });
      })}
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
