import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { demoUser } from '@/services/mock/demoData';
import { User, Save } from 'lucide-react';

export default function SettingsProfilePage() {
  const [profile, setProfile] = useState({
    displayName: demoUser.displayName,
    email: demoUser.email,
    jobTitle: 'Lead Developer',
    organization: 'Forge Workshop',
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
  });
  const [saved, setSaved] = useState(true);

  const handleChange = (key: string, value: string) => {
    setProfile({ ...profile, [key]: value });
    setSaved(false);
  };

  return (
    <div className="max-w-lg space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-amber-500">{demoUser.initials}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground-950">{profile.displayName}</h3>
            <p className="text-xs text-foreground-500">{profile.email}</p>
            <Button variant="ghost" size="sm" className="text-xs mt-1">Change Avatar</Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground-700 mb-1 block">Display Name</label>
            <input value={profile.displayName} onChange={(e) => handleChange('displayName', e.target.value)} className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-700 mb-1 block">Email</label>
            <input value={profile.email} onChange={(e) => handleChange('email', e.target.value)} type="email" className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1 block">Job Title</label>
              <input value={profile.jobTitle} onChange={(e) => handleChange('jobTitle', e.target.value)} className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1 block">Organization</label>
              <input value={profile.organization} onChange={(e) => handleChange('organization', e.target.value)} className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1 block">Timezone</label>
              <select value={profile.timezone} onChange={(e) => handleChange('timezone', e.target.value)} className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500">
                <option value="America/Los_Angeles">Pacific (UTC-8)</option>
                <option value="America/Chicago">Central (UTC-6)</option>
                <option value="America/New_York">Eastern (UTC-5)</option>
                <option value="Europe/London">London (UTC+0)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1 block">Locale</label>
              <select value={profile.locale} onChange={(e) => handleChange('locale', e.target.value)} className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500">
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-background-100">
          <Button size="sm" onClick={() => setSaved(true)} disabled={saved} icon={<Save className="h-3.5 w-3.5" />}>
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}