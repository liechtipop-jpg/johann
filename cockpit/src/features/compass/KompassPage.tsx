import { CalendarPlus, Compass, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useToday } from '@/lib/useNow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { PageHeader } from '@/ui/PageHeader';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Sheet } from '@/ui/Sheet';
import { addCompassSuggestions } from './actions';
import { EventForm, OptionNameForm } from './CompassForms';
import { MatrixView } from './MatrixView';
import { RankingView } from './RankingView';
import { TimelineCard } from './TimelineView';
import { useCompassData } from './useCompassData';

type Tab = 'ranking' | 'bewerten' | 'zeitstrahl';
const TABS = [
  { value: 'ranking' as const, label: 'Ranking' },
  { value: 'bewerten' as const, label: 'Bewerten' },
  { value: 'zeitstrahl' as const, label: 'Zeitstrahl' },
];

export default function KompassPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'bewerten' || raw === 'zeitstrahl' ? raw : 'ranking';
  const data = useCompassData();
  const today = useToday();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<'option' | 'event' | null>(null);
  if (!data) return null;
  const empty = data.options.length === 0 && data.criteria.length === 0;

  return (
    <>
      <PageHeader
        title="Studienwahl-Kompass"
        subtitle="Optionen gewichtet vergleichen – und sehen, wie knapp es ist."
        actions={
          !empty &&
          (tab === 'zeitstrahl' ? (
            <Button variant="primary" icon={<CalendarPlus size={18} aria-hidden />} onClick={() => setSheet('event')}>
              Termin
            </Button>
          ) : (
            <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => setSheet('option')}>
              Option
            </Button>
          ))
        }
      />
      {empty ? (
        <Card>
          <EmptyState
            icon={Compass}
            title="Noch keine Optionen"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" icon={<Sparkles size={18} aria-hidden />} onClick={() => void addCompassSuggestions(today)}>
                  Vorschläge übernehmen
                </Button>
                <Button icon={<Plus size={18} aria-hidden />} onClick={() => setSheet('option')}>
                  Eigene Option
                </Button>
              </div>
            }
          >
            Sechs Studienoptionen (ETH, UZH, HSG, Stanford, Ausland), zehn Kriterien und Termine mit Link zur offiziellen Quelle. Gewichte
            und Bewertungen setzt du selbst.
          </EmptyState>
        </Card>
      ) : (
        <>
          <SegmentedControl
            label="Ansicht"
            options={TABS}
            value={tab}
            onChange={(v) => setParams({ tab: v }, { replace: true })}
            className="mb-5 max-w-md"
          />
          {tab === 'ranking' && <RankingView data={data} />}
          {tab === 'bewerten' && <MatrixView data={data} />}
          {tab === 'zeitstrahl' && <TimelineCard data={data} />}
          {(data.options.length === 0 || data.criteria.length === 0) && (
            <p className="mt-4 text-[13px] text-ink-2">
              Tipp:{' '}
              <button
                type="button"
                className="font-medium text-accent-ink underline underline-offset-2"
                onClick={() => void addCompassSuggestions(today)}
              >
                Vorschläge für Optionen und Kriterien übernehmen
              </button>
            </p>
          )}
        </>
      )}
      <Sheet open={sheet === 'option'} onClose={() => setSheet(null)} title="Option hinzufügen">
        <OptionNameForm
          onDone={(option) => {
            setSheet(null);
            navigate(`/kompass/option/${option.id}`);
          }}
        />
      </Sheet>
      <Sheet open={sheet === 'event'} onClose={() => setSheet(null)} title="Termin hinzufügen">
        {sheet === 'event' && <EventForm options={data.options} onDone={() => setSheet(null)} />}
      </Sheet>
    </>
  );
}
