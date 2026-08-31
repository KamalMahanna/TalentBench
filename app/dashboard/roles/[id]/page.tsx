'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, GripVertical, FileStack, Brain, Code2, MessageSquare,
  Settings2, Save, Loader2, Upload, Link2, PencilLine, Zap, X, ChevronRight, Trash2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { GlowButton } from '@/components/glow-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import type { Round, RoundType, InputSource } from '@/lib/types';
import { cn } from '@/lib/utils';

const ROUND_TYPE_ICONS: Record<RoundType, typeof FileStack> = {
  resume_screen: FileStack,
  aptitude_test: Brain,
  dsa_round: Code2,
  interview: MessageSquare,
  custom: Settings2,
};

const ROUND_TYPES: { value: RoundType; label: string; icon: typeof FileStack; desc: string }[] = [
  { value: 'resume_screen', label: 'Resume Screen', icon: FileStack, desc: 'AI scores resumes against the job description' },
  { value: 'aptitude_test', label: 'Aptitude & Reasoning', icon: Brain, desc: 'Auto-generated test link, AI-graded' },
  { value: 'dsa_round', label: 'DSA Round', icon: Code2, desc: 'Coding problems evaluated by AI' },
  { value: 'interview', label: 'Technical Interview', icon: MessageSquare, desc: 'Interview rubric scored by AI' },
  { value: 'custom', label: 'Custom Round', icon: Settings2, desc: 'Define your own evaluation criteria' },
];

const INPUT_SOURCES: { value: InputSource; label: string; icon: typeof Upload }[] = [
  { value: 'excel_upload', label: 'Excel Upload', icon: Upload },
  { value: 'manual_entry', label: 'Manual Entry', icon: PencilLine },
  { value: 'ai_generated_link', label: 'AI-Generated Link', icon: Link2 },
];

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const roleId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => api.getRole(roleId),
  });

  const [rounds, setRounds] = useState<Round[]>([]);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);

  useEffect(() => {
    if (data?.data) setRounds(data.data.rounds);
  }, [data]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateRounds(roleId, rounds);
      queryClient.invalidateQueries({ queryKey: ['role', roleId] });
      toast.success('Pipeline saved');
    } catch {
      toast.error('Failed to save pipeline');
    } finally {
      setSaving(false);
    }
  }

  function addRound(type: RoundType) {
    const template = ROUND_TYPES.find((t) => t.value === type)!;
    const newRound: Round = {
      id: crypto.randomUUID(),
      role_id: roleId,
      name: template.label,
      type,
      order: rounds.length,
      input_source: type === 'resume_screen' ? 'excel_upload' : 'ai_generated_link',
      ai_scored: true,
      cutoff_threshold: 65,
      mail_template: `Hi {{name}}, your ${template.label} for {{role}} is ready.`,
      created_at: new Date().toISOString(),
    };
    setRounds([...rounds, newRound]);
    setAddOpen(false);
    setEditingRound(newRound);
  }

  function updateRound(id: string, updates: Partial<Round>) {
    setRounds(rounds.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function removeRound(id: string) {
    setRounds(rounds.filter((r) => r.id !== id));
    setEditingRound(null);
  }

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  const role = data?.data;
  if (!role) return <div>Role not found</div>;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <Link href="/dashboard/roles" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to roles
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{role.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{role.department}</span>
              <span>·</span>
              <span>{role.location}</span>
              <span>·</span>
              <Badge variant={role.status === 'active' ? 'default' : 'secondary'}>{role.status}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/roles/${role.id}/candidates`}>
              <GlowButton variant="outline">
                View candidates
                <ChevronRight className="ml-2 h-4 w-4" />
              </GlowButton>
            </Link>
            <GlowButton onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save pipeline
            </GlowButton>
          </div>
        </div>
      </div>

      {/* Pipeline builder */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Pipeline</h2>
        <span className="text-sm text-muted-foreground">{rounds.length} rounds · drag to reorder</span>
      </div>

      <div className="glass rounded-2xl p-6">
        {rounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Plus className="h-8 w-8" />
            </div>
            <h3 className="font-display text-lg font-semibold">No rounds yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add your first round to start building the pipeline</p>
            <GlowButton className="mt-6" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add round
            </GlowButton>
          </div>
        ) : (
          <>
            <Reorder.Group axis="y" values={rounds} onReorder={setRounds} className="space-y-3">
              {rounds.map((round, i) => {
                const Icon = ROUND_TYPE_ICONS[round.type];
                return (
                  <Reorder.Item key={round.id} value={round}>
                    <motion.div
                      layout
                      className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background-elevated p-4 transition-colors hover:border-primary/30"
                    >
                      {/* Drag handle */}
                      <div className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing">
                        <GripVertical className="h-5 w-5" />
                      </div>

                      {/* Order number */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-sm font-bold text-primary">
                        {i + 1}
                      </div>

                      {/* Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-medium">{round.name}</h3>
                          {round.ai_scored && (
                            <Badge variant="secondary" className="shrink-0 gap-1">
                              <Zap className="h-3 w-3" /> AI
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          Cutoff: {round.cutoff_threshold}% · {INPUT_SOURCES.find((s) => s.value === round.input_source)?.label}
                        </p>
                      </div>

                      {/* Configure */}
                      <Button variant="ghost" size="sm" onClick={() => setEditingRound(round)}>
                        <Settings2 className="h-4 w-4" />
                        Configure
                      </Button>
                    </motion.div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>

            <div className="mt-4">
              <GlowButton variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add round
              </GlowButton>
            </div>
          </>
        )}
      </div>

      {/* Add round dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a round</DialogTitle>
            <DialogDescription>Choose the type of evaluation round to add to your pipeline</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {ROUND_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => addRound(type.value)}
                className="flex items-center gap-4 rounded-xl border border-border bg-background-elevated p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <type.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit round dialog */}
      <Dialog open={!!editingRound} onOpenChange={(open) => !open && setEditingRound(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {editingRound && (
            <>
              <DialogHeader>
                <DialogTitle>Configure: {editingRound.name}</DialogTitle>
                <DialogDescription>Set up how this round evaluates candidates</DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <Label>Round name</Label>
                  <Input
                    value={editingRound.name}
                    onChange={(e) => updateRound(editingRound.id, { name: e.target.value })}
                    className="bg-background-elevated"
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label>Round type</Label>
                  <Select value={editingRound.type} onValueChange={(v) => updateRound(editingRound.id, { type: v as RoundType })}>
                    <SelectTrigger className="bg-background-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUND_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Input source */}
                <div className="space-y-2">
                  <Label>Input source</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {INPUT_SOURCES.map((src) => (
                      <button
                        key={src.value}
                        onClick={() => updateRound(editingRound.id, { input_source: src.value })}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all',
                          editingRound.input_source === src.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background-elevated text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        <src.icon className="h-4 w-4" />
                        {src.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI scoring */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-background-elevated p-4">
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      <Zap className="h-4 w-4 text-primary" /> AI scoring
                    </div>
                    <p className="text-xs text-muted-foreground">Let AI evaluate and score this round</p>
                  </div>
                  <Switch
                    checked={editingRound.ai_scored}
                    onCheckedChange={(checked) => updateRound(editingRound.id, { ai_scored: checked })}
                  />
                </div>

                {/* Cutoff */}
                <div className="space-y-2">
                  <Label>Cutoff threshold: {editingRound.cutoff_threshold}%</Label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editingRound.cutoff_threshold}
                    onChange={(e) => updateRound(editingRound.id, { cutoff_threshold: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Mail template */}
                <div className="space-y-2">
                  <Label>Mail template</Label>
                  <Textarea
                    value={editingRound.mail_template}
                    onChange={(e) => updateRound(editingRound.id, { mail_template: e.target.value })}
                    className="bg-background-elevated min-h-[80px]"
                    placeholder="Hi {{name}}, your {{role}} evaluation is ready."
                  />
                  <p className="text-xs text-muted-foreground">Variables: {'{{name}}'}, {'{{role}}'}, {'{{gap_summary}}'}</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="destructive" onClick={() => removeRound(editingRound.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </Button>
                <GlowButton onClick={() => setEditingRound(null)}>Done</GlowButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
