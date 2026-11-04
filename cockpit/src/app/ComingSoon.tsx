import type { LucideIcon } from 'lucide-react';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { PageHeader } from '@/ui/PageHeader';

/** Vorübergehend, bis das Modul in seiner Phase gebaut ist. */
export function ComingSoon({ title, phase, icon }: { title: string; phase: number; icon: LucideIcon }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={icon} title="Kommt bald">
          Dieser Bereich entsteht in Phase {phase}.
        </EmptyState>
      </Card>
    </>
  );
}
