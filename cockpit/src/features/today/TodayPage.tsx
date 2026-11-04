import { X } from 'lucide-react';
import { InstallHint } from '@/app/InstallHint';
import { patchSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { BackupReminder } from '@/features/backup/BackupReminder';
import { formatDate, greeting, isoWeek, toISODate } from '@/lib/dates';
import { useInstallState } from '@/lib/platform';
import { useNow } from '@/lib/useNow';
import { IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { PageHeader } from '@/ui/PageHeader';
import { Countdowns } from './Countdowns';
import { FirstSteps } from './FirstSteps';

export default function TodayPage() {
  const { profile, install } = useSettings();
  const installState = useInstallState();
  const now = useNow();
  const date = new Date(now);
  const today = toISODate(date);
  const name = profile.name.trim();

  return (
    <>
      <PageHeader
        title={`${greeting(date.getHours())}${name ? `, ${name}` : ''}`}
        subtitle={`${formatDate(today, 'full')} · KW ${isoWeek(today)}`}
      />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <BackupReminder className="lg:col-span-2" />
        <FirstSteps />
        <Countdowns today={today} />
        {!install.hintDismissed && !installState.standalone && (
          <Card
            title="Als App installieren"
            action={
              <IconButton
                label="Hinweis ausblenden"
                onClick={() => void patchSetting('install', { hintDismissed: true })}
                className="-mr-2"
              >
                <X size={18} aria-hidden />
              </IconButton>
            }
          >
            <InstallHint compact />
          </Card>
        )}
      </div>
    </>
  );
}
