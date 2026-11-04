import { Ellipsis } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/cn';
import { NAV_ITEMS, isActivePath } from './nav';

const MORE_PATHS = ['/mehr', ...NAV_ITEMS.filter((i) => !i.tab).map((i) => i.to)];

/** Tab-Leiste unten auf dem Handy. */
export function TabBar() {
  const { pathname } = useLocation();
  const items = [
    ...NAV_ITEMS.filter((i) => i.tab).map((i) => ({ ...i, active: isActivePath(pathname, i.to) })),
    { to: '/mehr', label: 'Mehr', icon: Ellipsis, active: MORE_PATHS.some((p) => isActivePath(pathname, p)) },
  ];
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-lg">
        {items.map(({ to, label, icon: Icon, active }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150',
                active ? 'text-accent-ink' : 'text-ink-2 hover:text-ink',
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.75} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
