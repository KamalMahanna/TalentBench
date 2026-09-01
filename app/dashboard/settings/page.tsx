'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  UserPlus, Trash2, Mail, Shield, Eye, Zap, Save, Loader2,
  Building2, Users as UsersIcon, Sun, Moon, Laptop, Palette,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { api } from '@/lib/api-client';
import { GlowButton } from '@/components/glow-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import type { OrgMember } from '@/lib/types';
import { cn } from '@/lib/utils';

const ROLE_CONFIG = {
  admin: { icon: Shield, color: 'text-primary', bg: 'bg-primary/10' },
  recruiter: { icon: Zap, color: 'text-accent', bg: 'bg-accent/10' },
  viewer: { icon: Eye, color: 'text-muted-foreground', bg: 'bg-muted' },
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgMember['role']>('recruiter');
  const [inviting, setInviting] = useState(false);
  const [mailTemplate, setMailTemplate] = useState(
    `Hi {{name}},\n\nYour application for {{role}} has been reviewed. Here's your performance summary:\n\n{{gap_summary}}\n\nView your full report: {{report_link}}\n\nBest regards,\nThe Hiring Team`
  );

  const { data: orgData } = useQuery({ queryKey: ['org'], queryFn: () => api.getOrg() });
  const { data: membersData, isLoading } = useQuery({ queryKey: ['members'], queryFn: () => api.getOrgMembers() });

  const org = orgData?.data;
  const members = membersData?.data ?? [];

  async function handleInvite() {
    setInviting(true);
    try {
      await api.inviteMember(inviteEmail, inviteRole);
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['org'] });
      toast.success(`Invited ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail('');
    } catch {
      toast.error('Failed to send invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(id: string) {
    await api.removeMember(id);
    queryClient.invalidateQueries({ queryKey: ['members'] });
    queryClient.invalidateQueries({ queryKey: ['org'] });
    toast.success('Member removed');
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your organization, team, and templates</p>
      </div>

      <Tabs defaultValue="team">
        <TabsList className="mb-6">
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="org">Organization</TabsTrigger>
          <TabsTrigger value="templates">Mail Templates</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* Team tab */}
        <TabsContent value="team">
          <div className="glass rounded-2xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Team Members</h2>
                <p className="text-sm text-muted-foreground">
                  {org?.seats_used} of {org?.seats_total} seats used
                </p>
              </div>
              <GlowButton onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" /> Invite
              </GlowButton>
            </div>

            {/* Seats bar */}
            {org && (
              <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-chart-4" style={{ width: `${(org.seats_used / org.seats_total) * 100}%` }} />
              </div>
            )}

            {/* Member list */}
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
              </div>
            ) : (
              <Stagger className="space-y-2">
                {members.map((member) => {
                  const config = ROLE_CONFIG[member.role];
                  return (
                    <StaggerItem key={member.id}>
                      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-background-elevated p-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url} alt={member.name} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                        <div className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', config.bg, config.color)}>
                          <config.icon className="h-3 w-3" />
                          {member.role}
                        </div>
                        <span className="hidden text-xs text-muted-foreground sm:block">
                          {new Date(member.last_active).toLocaleDateString()}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(member.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            )}
          </div>
        </TabsContent>

        {/* Org tab */}
        <TabsContent value="org">
          <div className="glass rounded-2xl p-6">
            <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold">
              <Building2 className="h-5 w-5 text-primary" /> Organization
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Organization name</Label>
                <Input defaultValue={org?.name} className="bg-background-elevated" />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="capitalize">{org?.plan}</Badge>
                  <span className="text-sm text-muted-foreground">{org?.seats_total} seats · {org?.plan === 'pro' ? 'Unlimited roles' : '5 roles'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <GlowButton variant="outline" size="sm">Upload logo</GlowButton>
                </div>
              </div>
              <div className="pt-4">
                <GlowButton>
                  <Save className="h-4 w-4" /> Save changes
                </GlowButton>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Mail templates tab */}
        <TabsContent value="templates">
          <div className="glass rounded-2xl p-6">
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
              <Mail className="h-5 w-5 text-primary" /> Mail Templates
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Use variables: {'{{name}}'}, {'{{role}}'}, {'{{gap_summary}}'}, {'{{report_link}}'}
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template name</Label>
                <Input defaultValue="Performance Report Notification" className="bg-background-elevated" />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input defaultValue="Your performance report for {{role}} is ready" className="bg-background-elevated" />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={mailTemplate}
                  onChange={(e) => setMailTemplate(e.target.value)}
                  className="bg-background-elevated min-h-[200px] font-mono text-sm"
                />
              </div>
              <div className="rounded-xl bg-primary/5 p-4">
                <div className="mb-2 text-xs font-medium text-primary">Preview</div>
                <div className="whitespace-pre-wrap text-sm text-foreground/90">
                  {mailTemplate
                    .replace('{{name}}', 'Alex Morgan')
                    .replace('{{role}}', 'Senior Frontend Engineer')
                    .replace('{{gap_summary}}', 'Strong in React and TypeScript; improvement needed in quantitative reasoning.')
                    .replace('{{report_link}}', 'https://talentbench.io/r/abc123')}
                </div>
              </div>
              <div className="pt-2">
                <GlowButton>
                  <Save className="h-4 w-4" /> Save template
                </GlowButton>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Appearance tab */}
        <TabsContent value="appearance">
          <div className="glass rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="font-display text-lg font-semibold">Theme Preferences</h2>
              <p className="text-sm text-muted-foreground">
                Customize how TalentBench looks on your device
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Light theme option */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn(
                  'flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all cursor-pointer',
                  theme === 'light'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                    : 'border-border bg-background-elevated hover:border-primary/40',
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Light Mode</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clean, high-contrast light theme for bright environments
                  </p>
                </div>
              </button>

              {/* Dark theme option */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn(
                  'flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all cursor-pointer',
                  theme === 'dark'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                    : 'border-border bg-background-elevated hover:border-primary/40',
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Moon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Dark Mode</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Classic dark mesh aesthetic with neon accents
                  </p>
                </div>
              </button>

              {/* System theme option */}
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={cn(
                  'flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all cursor-pointer',
                  theme === 'system'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                    : 'border-border bg-background-elevated hover:border-primary/40',
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">System Default</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatically syncs with your OS light/dark setting
                  </p>
                </div>
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>Send an invitation to join your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-background-elevated pl-10"
                  placeholder="colleague@company.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgMember['role'])}>
                <SelectTrigger className="bg-background-elevated">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — full access</SelectItem>
                  <SelectItem value="recruiter">Recruiter — manage roles and candidates</SelectItem>
                  <SelectItem value="viewer">Viewer — read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <GlowButton onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Send invite
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
