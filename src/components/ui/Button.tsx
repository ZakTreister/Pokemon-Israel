import { forwardRef, ComponentPropsWithoutRef } from 'react';
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
        'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-glow-blue': variant === 'default',
        'bg-gold text-navy-700 hover:bg-gold-light shadow-cta hover:shadow-cta-hover': variant === 'cta',
        'bg-red-400 text-white hover:bg-red-500 shadow-glow-red': variant === 'live',
        'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
        'bg-success text-success-foreground hover:bg-success/90': variant === 'success',
        'border-2 border-navy-500/20 bg-white text-navy-700 hover:border-blue-400 hover:bg-blue-50': variant === 'outline',
        'bg-blue-gradient text-white hover:opacity-90 shadow-card': variant === 'secondary',
        'bg-transparent text-navy-700 hover:bg-navy-50': variant === 'ghost',
        'text-blue-500 underline-offset-4 hover:underline': variant === 'link',
        'h-10 px-5 py-2': size === 'default',
        'h-9 rounded-md px-4': size === 'sm',
        'h-12 rounded-lg px-8 text-base': size === 'lg',
        'h-10 w-10': size === 'icon',
      },
      className
    );

    if (asChild) {
      const child = children as React.ReactElement;
      if (child && child.type) {
        return React.cloneElement(child, {
          className: cn(baseClasses, child.props.className),
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
