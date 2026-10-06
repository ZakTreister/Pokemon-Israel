import { forwardRef, ComponentPropsWithoutRef, cloneElement, isValidElement, ReactElement } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps
  extends ComponentPropsWithoutRef<'button'> {
  asChild?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | 'cta' | 'live';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {
    const baseClasses = cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      {
        'bg-blue-gradient text-white shadow-button-blue hover:brightness-110 motion-safe:hover:-translate-y-0.5': variant === 'default' || variant === 'secondary',
        'bg-gold-gradient text-navy-700 shadow-button-gold hover:brightness-105 motion-safe:hover:-translate-y-0.5': variant === 'cta',
        'bg-red-400 text-white hover:bg-red-500 shadow-glow-red': variant === 'live',
        'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
        'bg-success text-success-foreground hover:bg-success/90': variant === 'success',
        'border-2 border-navy-500 bg-card text-card-foreground hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-navy-600/40': variant === 'outline',
        'bg-transparent text-foreground hover:bg-muted': variant === 'ghost',
        'text-blue-500 underline-offset-4 hover:underline': variant === 'link',
        'h-10 px-5 py-2': size === 'default',
        'h-9 rounded-md px-4': size === 'sm',
        'h-12 rounded-lg px-8 text-base': size === 'lg',
        'h-10 w-10': size === 'icon',
      },
      className
    );

    if (asChild) {
      const child = children as ReactElement;
      if (isValidElement(child)) {
        return cloneElement(child, {
          className: cn(baseClasses, (child.props as Record<string, unknown>)?.className as string),
          ...props
        });
      }
    }

    return (
      <button
        className={baseClasses}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
