import { Plus, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/cn';
import { Kbd } from '@/ui/Kbd';
import { MOD_KEY, NAV_ITEMS, isActivePath } from './nav';
import { ui } from './uiStore';

/** Seitenleiste auf dem Desktop. */
export function Sidebar() {
  const { pathname } = useLocation();
  const main = NAV_ITEMS.filter((i) => i.to !== '/einstellungen');
  const settings = NAV_ITEMS.find((i) => i.to === '/einstellungen');

  const link = (item: (typeof NAV_ITEMS)[number]) => {
    const active = isActivePath(pathname, item.to);
    const Icon = item.icon;
    return (
      <Link
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors duration-150',
          active ? 'bg-surface-2 font-semibold text-ink dark:bg-surface-3' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        )}
      >
        <Icon size={19} strokeWidth={active ? 2.1 : 1.75} aria-hidden className={active ? 'text-accent-ink' : undefined} />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-bg px-3 pt-6 pb-4 lg:flex">
      <div className="flex items-center gap-2.5 px-3 pb-6">
        <img src="/favicon.svg" alt="" className="size-7 rounded-[8px]" />
        <span className="font-serif text-[26px] leading-none">Cockpit</span>
      </div>
      <button
        type="button"
        onClick={() => ui.openQuickAdd()}
        aria-haspopup="dialog"
        className="flex h-10 items-center gap-2 rounded-[10px] bg-accent px-3 text-[15px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
      >
        <Plus size={18} aria-hidden />
        <span className="flex-1 text-left">Erfassen</span>
        <kbd className="rounded-[5px] bg-white/20 px-1.5 text-xs font-medium">N</kbd>
      </button>
      <button
        type="button"
        onClick={() => ui.openPalette()}
        aria-haspopup="dialog"
        className="mt-2 flex h-10 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
      >
        <Search size={16} aria-hidden />
        <span className="flex-1 text-left">Suchen …</span>
        <Kbd>{MOD_KEY} K</Kbd>
      </button>
      <nav aria-label="Hauptnavigation" className="mt-6 flex-1">
        <ul className="space-y-0.5">
          {main.map((item) => (
            <li key={item.to}>{link(item)}</li>
          ))}
        </ul>
      </nav>
      {settings && link(settings)}
    </aside>
  );
}
