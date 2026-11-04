import { CalendarPlus, Compass, ExternalLink, Link2, Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import type { StudyOption } from '@/db/schemas';
import { BackLink } from '@/ui/BackLink';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Input, Textarea } from '@/ui/Field';
import { PageHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/Sheet';
import { toastUndo } from '@/ui/toast';
import { deleteOption, saveOption } from './actions';
import { EventForm, OptionNameForm } from './CompassForms';
import { formatScore } from './format';
import { RatingSelect } from './RatingSelect';
import { TimelineView } from './TimelineView';
import { useCompassData } from './useCompassData';

/** Eine Studienoption: Bewertung, Pro/Contra, Notizen, Links und Termine. */
export default function OptionDetailPage() {
  const { optionId = '' } = useParams();
  const data = useCompassData();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<'name' | 'event' | null>(null);
  if (!data) return null;
  const option = data.optionMap.get(optionId);
  if (!option) {
    return (
      <>
        <BackLink to="/kompass" label="Kompass" />
        <EmptyState icon={Compass} title="Option nicht gefunden">
          Vielleicht wurde sie gelöscht.
        </EmptyState>
      </>
    );
  }
  const score = data.scoreMap.get(option.id);
  const ranked = data.scores.filter((s) => s.rank !== null).length;
  const events = data.timeline.filter((e) => e.optionId === option.id);

  return (
    <>
      <BackLink to="/kompass" label="Kompass" />
      <PageHeader
        title={option.name}
        subtitle={score?.score != null ? `Platz ${score.rank} von ${ranked} · ${formatScore(score.score)} Punkte` : 'Noch nicht bewertet'}
        actions={
          <>
            <IconButton label="Option umbenennen" onClick={() => setSheet('name')}>
              <Pencil size={18} aria-hidden />
            </IconButton>
            <IconButton
              label="Option löschen"
              onClick={async () => {
                await deleteOption(option);
                navigate('/kompass');
              }}
            >
              <Trash2 size={18} aria-hidden />
            </IconButton>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-4">
          <Card title="Bewertung" description="1 = trifft gar nicht zu, 10 = trifft voll zu">
            {data.criteria.length === 0 ? (
              <p className="text-[15px] text-ink-2">Noch keine Kriterien – lege sie unter «Bewerten» an.</p>
            ) : (
              <ul className="-my-1 divide-y divide-line">
                {data.criteria.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-1.5">
                    <span className="min-w-0 flex-1 text-[15px]">
                      {c.name}
                      <span className="block text-[12px] text-ink-2">Gewicht {c.weight}</span>
                    </span>
                    <RatingSelect
                      optionId={option.id}
                      criterionId={c.id}
                      value={data.map.get(option.id)?.get(c.id)}
                      label={`Bewertung bei «${c.name}»`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Pro & Contra">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ListEditor option={option} field="pros" title="Dafür spricht" placeholder="z. B. Praxisnah" icon={Plus} />
              <ListEditor option={option} field="cons" title="Dagegen spricht" placeholder="z. B. Weit weg" icon={Minus} />
            </div>
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          <NotesCard key={option.id} option={option} />
          <LinksCard option={option} />
          <Card
            title="Termine"
            action={
              <Button size="sm" icon={<CalendarPlus size={16} aria-hidden />} onClick={() => setSheet('event')}>
                Termin
              </Button>
            }
          >
            <TimelineView data={data} events={events} emptyText="Keine eigenen Termine. Allgemeine Fristen stehen im Zeitstrahl." />
          </Card>
        </div>
      </div>
      <Sheet open={sheet === 'name'} onClose={() => setSheet(null)} title="Option umbenennen">
        {sheet === 'name' && <OptionNameForm initial={option} onDone={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={sheet === 'event'} onClose={() => setSheet(null)} title="Termin hinzufügen">
        {sheet === 'event' && <EventForm options={data.options} defaultOptionId={option.id} onDone={() => setSheet(null)} />}
      </Sheet>
    </>
  );
}

function ListEditor({
  option,
  field,
  title,
  placeholder,
  icon: Icon,
}: {
  option: StudyOption;
  field: 'pros' | 'cons';
  title: string;
  placeholder: string;
  icon: typeof Plus;
}) {
  const [text, setText] = useState('');
  const items = option[field];
  async function add(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    await saveOption({ ...option, [field]: [...items, text.trim()] });
    setText('');
  }
  return (
    <div>
      <h3 className="mb-2 text-[13px] font-semibold text-ink-2">{title}</h3>
      {items.length > 0 && (
        <ul className="mb-2 space-y-1">
          {items.map((item, i) => (
            <li key={`${i}-${item}`} className="flex items-start gap-2 text-[15px]">
              <Icon size={16} aria-hidden className="mt-1 shrink-0 text-ink-3" />
              <span className="min-w-0 flex-1 break-words">{item}</span>
              <IconButton
                label={`«${item}» entfernen`}
                className="-my-2 -mr-2"
                onClick={async () => {
                  await saveOption({ ...option, [field]: items.filter((_, j) => j !== i) });
                  toastUndo('Eintrag entfernt', () => saveOption(option));
                }}
              >
                <X size={15} aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex gap-2">
        <Input
          aria-label={`${title}: neuer Punkt`}
          maxLength={300}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <IconButton type="submit" label={`${title}: hinzufügen`} disabled={!text.trim()} className="border border-line">
          <Plus size={16} aria-hidden />
        </IconButton>
      </form>
    </div>
  );
}

function NotesCard({ option }: { option: StudyOption }) {
  const [notes, setNotes] = useState(option.notes);
  const latest = useRef(option);
  useEffect(() => {
    latest.current = option;
  }, [option]);
  // Automatisch speichern, kurz nach dem letzten Tastendruck
  useEffect(() => {
    if (notes === latest.current.notes) return;
    const id = setTimeout(() => void saveOption({ ...latest.current, notes }), 600);
    return () => clearTimeout(id);
  }, [notes]);
  return (
    <Card title="Notizen" description="Wird automatisch gespeichert.">
      <Textarea
        aria-label="Notizen zur Option"
        rows={5}
        maxLength={5000}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== latest.current.notes && void saveOption({ ...latest.current, notes })}
        placeholder="Eindrücke vom Infotag, Fragen an Studierende, Voraussetzungen …"
      />
    </Card>
  );
}

const urlSchema = z.url({ protocol: /^https?$/ });

function LinksCard({ option }: { option: StudyOption }) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string>();
  async function add(event: FormEvent) {
    event.preventDefault();
    if (!urlSchema.safeParse(url.trim()).success) return setError('Bitte eine vollständige Adresse mit https:// eingeben.');
    let fallback = url.trim();
    try {
      fallback = new URL(url.trim()).hostname;
    } catch {
      // bleibt die Adresse
    }
    await saveOption({ ...option, links: [...option.links, { label: label.trim() || fallback, url: url.trim() }] });
    setLabel('');
    setUrl('');
    setError(undefined);
  }
  return (
    <Card title="Links">
      {option.links.length > 0 && (
        <ul className="mb-3 space-y-1">
          {option.links.map((link, i) => (
            <li key={`${i}-${link.url}`} className="flex items-center gap-2">
              <Link2 size={16} aria-hidden className="shrink-0 text-ink-3" />
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-[15px] font-medium text-accent-ink hover:underline"
              >
                {link.label}
                <ExternalLink size={13} aria-hidden className="ml-1 inline" />
              </a>
              <IconButton
                label={`Link «${link.label}» entfernen`}
                className="-mr-2"
                onClick={async () => {
                  await saveOption({ ...option, links: option.links.filter((_, j) => j !== i) });
                  toastUndo('Link entfernt', () => saveOption(option));
                }}
              >
                <X size={15} aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} noValidate className="space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            aria-label="Bezeichnung des Links"
            maxLength={120}
            placeholder="Bezeichnung"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Input
            aria-label="Adresse des Links"
            aria-invalid={error ? true : undefined}
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        {error && <p className="text-[13px] font-medium text-danger">{error}</p>}
        <Button type="submit" size="sm" icon={<Plus size={16} aria-hidden />} disabled={!url.trim()}>
          Link hinzufügen
        </Button>
      </form>
    </Card>
  );
}
