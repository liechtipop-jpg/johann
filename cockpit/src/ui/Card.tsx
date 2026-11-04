import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}

export function Card({ title, description, action, children, className, bodyClassName, id }: CardProps) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn('scroll-mt-6 rounded-[14px] border border-line bg-surface', className)}
    >
      {(title || action) && (
        <header className="flex items-center gap-3 px-4 pt-3.5 lg:px-5 lg:pt-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 id={headingId} className="text-[15px] font-semibold">
                {title}
              </h2>
            )}
            {description && <p className="text-[13px] text-ink-2">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('px-4 pt-3 pb-4 lg:px-5 lg:pb-5', bodyClassName)}>{children}</div>
    </section>
  );
}
