import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Sheet } from '@/ui/Sheet';
import { MetronomePanel } from './MetronomePanel';
import { PieceForm } from './PieceForm';
import { PracticePanel } from './PracticePanel';
import { RepertoireList } from './RepertoireList';
import { usePianoData } from './usePianoData';

type Tab = 'ueben' | 'metronom' | 'repertoire';
const TABS = [
  { value: 'ueben' as const, label: 'Üben' },
  { value: 'metronom' as const, label: 'Metronom' },
  { value: 'repertoire' as const, label: 'Repertoire' },
];

export default function KlavierPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'metronom' || raw === 'repertoire' ? raw : 'ueben';
  const data = usePianoData();
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Klavier"
        actions={
          tab === 'repertoire' && (
            <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => setAdding(true)}>
              Stück
            </Button>
          )
        }
      />
      <SegmentedControl
        label="Ansicht"
        options={TABS}
        value={tab}
        onChange={(v) => setParams({ tab: v }, { replace: true })}
        className="mb-5 max-w-md"
      />
      {tab === 'metronom' && <MetronomePanel />}
      {tab === 'ueben' && data && <PracticePanel data={data} />}
      {tab === 'repertoire' && data && <RepertoireList data={data} onAdd={() => setAdding(true)} />}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Stück hinzufügen">
        <PieceForm
          onDone={(piece) => {
            setAdding(false);
            navigate(`/klavier/stueck/${piece.id}`);
          }}
        />
      </Sheet>
    </>
  );
}
