import { ChevronRight, Keyboard } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '@/ui/Card';
import { PageHeader } from '@/ui/PageHeader';
import { NAV_ITEMS } from './nav';
import { ui } from './uiStore';

export default function MorePage() {
  const rowClass = 'flex h-14 w-full items-center gap-3 rounded-[10px] px-3 text-left transition-colors hover:bg-surface-2';
  return (
    <>
      <PageHeader title="Mehr" />
      <Card bodyClassName="p-2 lg:p-2">
        <ul>
          {NAV_ITEMS.filter((item) => !item.tab).map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className={rowClass}>
                <Icon size={20} aria-hidden className="text-ink-2" />
                <span className="flex-1 text-[16px]">{label}</span>
                <ChevronRight size={18} aria-hidden className="text-ink-3" />
              </Link>
            </li>
          ))}
          <li className="hidden lg:block">
            <button type="button" onClick={ui.openShortcuts} className={rowClass}>
              <Keyboard size={20} aria-hidden className="text-ink-2" />
              <span className="flex-1 text-[16px]">Tastenkürzel</span>
            </button>
          </li>
        </ul>
      </Card>
    </>
  );
}
