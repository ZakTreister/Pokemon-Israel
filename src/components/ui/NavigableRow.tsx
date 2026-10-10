import type { ReactNode, MouseEvent, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NavigableRow({
  to,
  as = 'tr',
  className = '',
  children,
}: {
  to: string;
  as?: 'tr' | 'div';
  className?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const Tag = as;
  if (!to) return <Tag className={className}>{children}</Tag>;
  const click = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (
      event.defaultPrevented ||
      target.closest?.('a,button,input,select,textarea,summary,[role="button"]')
    )
      return;
    navigate(to);
  };
  const key = (event: KeyboardEvent<HTMLElement>) => {
    if (
      event.target !== event.currentTarget ||
      !['Enter', ' '].includes(event.key)
    )
      return;
    event.preventDefault();
    navigate(to);
  };
  return (
    <Tag
      tabIndex={0}
      role={as === 'div' ? 'link' : undefined}
      aria-label="פתח פרופיל שחקן"
      onClick={click}
      onKeyDown={key}
      className={`${className} cursor-pointer hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500`}
    >
      {children}
    </Tag>
  );
}
