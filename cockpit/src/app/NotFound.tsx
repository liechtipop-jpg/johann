import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/ui/EmptyState';

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Seite nicht gefunden"
      action={
        <Link to="/" className="inline-flex h-11 items-center rounded-[10px] bg-accent px-4 font-medium text-on-accent">
          Zu «Heute»
        </Link>
      }
    >
      Diese Adresse gibt es in Cockpit nicht.
    </EmptyState>
  );
}
