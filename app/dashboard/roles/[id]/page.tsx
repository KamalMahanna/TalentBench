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
  FileText, Sparkles, Edit3, Check, CheckCircle2, Sliders, Percent, Users,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import type { Round, RoundType, InputSource, Role } from '@/lib/types';
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
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const editingRound = rounds.find((r) => r.id === editingRoundId) || null;

  // Role & JD details state
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState<'Full-time' | 'Part-time' | 'Contract' | 'Internship'>('Full-time');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'closed' | 'archived'>('active');
  const [isEditingJD, setIsEditingJD] = useState(false);
  const [uploadingJD, setUploadingJD] = useState(false);

  useEffect(() => {
    if (data?.data) {
      setRounds(data.data.rounds || []);
      setTitle(data.data.title || '');
      setDepartment(data.data.department || 'Engineering');
      setLocation(data.data.location || 'Remote');
      setEmploymentType(data.data.employment_type || 'Full-time');
      setDescription(data.data.description || '');
      setStatus(data.data.status || 'active');
    }
  }, [data]);

  async function handleSaveAll() {
    setSaving(true);
    try {
      // 1. Update role metadata & JD
      await api.updateRole(roleId, {
        title,
        department,
        location,
        employment_type: employmentType,
        description,
        status,
      });

      // 2. Update pipeline rounds
      await api.updateRounds(roleId, rounds);

      queryClient.invalidateQueries({ queryKey: ['role', roleId] });
      toast.success('Role, Job Description, and Pipeline saved successfully');
      setIsEditingJD(false);
    } catch {
      toast.error('Failed to save role updates');
    } finally {
      setSaving(false);
    }
  }

  async function handleJDUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingJD(true);
    try {
      const res = await api.uploadJobDescription(roleId, file);
      if (res.data?.description) {
        setDescription(res.data.description);
      }
      queryClient.invalidateQueries({ queryKey: ['role', roleId] });
      toast.success(`Job Description updated from ${file.name}`);
    } catch {
      toast.error('Failed to upload and parse Job Description');
    } finally {
      setUploadingJD(false);
    }
  }

  const [polishingJD, setPolishingJD] = useState(false);

  async function handlePolishJD() {
    if (!description.trim() || description.trim().length < 15) {
      toast.error('Please enter or upload a job description first');
      return;
    }

    setPolishingJD(true);
    try {
      const res = await api.polishJobDescription(description);
      if (res?.data?.polished_text) {
        setDescription(res.data.polished_text);
        if (res.data.tokens_saved_estimate > 0) {
          toast.success(
            `Job description polished! Removed unnecessary company fluff (~${res.data.tokens_saved_estimate} tokens saved)`,
          );
        } else {
          toast.success('Job description polished with AI');
        }
      }
    } catch {
      toast.error('Failed to polish job description');
    } finally {
      setPolishingJD(false);
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
    setRounds((prev) => [...prev, newRound]);
    setAddOpen(false);
    setEditingRoundId(newRound.id);
  }

  function updateRound(id: string, updates: Partial<Round>) {
    setRounds((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function removeRound(id: string) {
    setRounds((prev) => prev.filter((r) => r.id !== id));
    setEditingRoundId(null);
  }

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  const role = data?.data;
  if (!role) return <div>Role not found</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link href="/dashboard/roles" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to roles
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{title || role.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{employmentType || role.employment_type}</span>
              <span>·</span>
              <Badge variant={status === 'active' ? 'default' : 'secondary'}>{status}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/roles/${role.id}/candidates`}>
              <GlowButton variant="outline">
                View candidates
                <ChevronRight className="ml-2 h-4 w-4" />
              </GlowButton>
            </Link>
            <GlowButton onClick={handleSaveAll} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </GlowButton>
          </div>
        </div>
      </div>

      {/* ── Job Description & Criteria Section ─────────────────────────────── */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Job Description & Benchmark Criteria</h2>
              <p className="text-xs text-muted-foreground">The AI engine scores incoming resumes against this job description and extracted competencies.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium bg-background-elevated hover:bg-muted border border-border px-3 py-1.5 rounded-lg cursor-pointer transition-all">
              {uploadingJD ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-primary" />}
              <span>{uploadingJD ? 'Parsing...' : 'Upload JD File (.pdf, .docx)'}</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                className="hidden"
                disabled={uploadingJD}
                onChange={handleJDUpload}
              />
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingJD(!isEditingJD)}
              className="gap-1.5 text-xs"
            >
              {isEditingJD ? <Check className="h-3.5 w-3.5 text-primary" /> : <Edit3 className="h-3.5 w-3.5" />}
              {isEditingJD ? 'Done Editing' : 'Edit JD'}
            </Button>
          </div>
        </div>

        {isEditingJD ? (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Role Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background-elevated" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Employment Type</Label>
                <Select value={employmentType} onValueChange={(v: any) => setEmploymentType(v)}>
                  <SelectTrigger className="bg-background-elevated text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Job Description Text & Requirements</Label>
                {description.trim().length > 20 && (
                  <button
                    type="button"
                    onClick={handlePolishJD}
                    disabled={polishingJD}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {polishingJD ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    <span>{polishingJD ? 'Polishing...' : 'Polish with AI'}</span>
                  </button>
                )}
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                placeholder="Paste the full job description here..."
                className="bg-background-elevated font-sans text-sm leading-relaxed resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              data-lenis-prevent="true"
              className="rounded-xl border border-border/40 bg-background-elevated/60 p-4 text-sm text-foreground/90 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans leading-relaxed overscroll-contain"
            >
              {description || (
                <span className="italic text-muted-foreground">
                  No Job Description entered yet. Click &quot;Edit JD&quot; or upload a JD document to add requirements.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Pipeline Builder Section ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Screening Pipeline</h2>
            <p className="text-xs text-muted-foreground">{rounds.length} rounds · drag to reorder stages</p>
          </div>
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
                            Cutoff:{' '}
                            {round.cutoff_type === 'count'
                              ? `Top ${round.cutoff_count || 300} resumes`
                              : round.cutoff_threshold > 0
                              ? `${round.cutoff_threshold}%`
                              : 'No minimum'}{' '}
                            · {INPUT_SOURCES.find((s) => s.value === round.input_source)?.label}
                          </p>
                        </div>

                        {/* Configure */}
                        <Button variant="ghost" size="sm" onClick={() => setEditingRoundId(round.id)}>
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
      <Dialog open={!!editingRound} onOpenChange={(open) => !open && setEditingRoundId(null)}>
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
                  <Label htmlFor="round-name-input">Round name</Label>
                  <Input
                    id="round-name-input"
                    value={editingRound.name}
                    onChange={(e) => updateRound(editingRound.id, { name: e.target.value })}
                    placeholder="e.g. Resume Screen, Aptitude & Reasoning, DSA Round"
                    className="bg-background-elevated"
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label>Round type</Label>
                  <Select
                    value={editingRound.type}
                    onValueChange={(v) => {
                      const newType = v as RoundType;
                      updateRound(editingRound.id, {
                        type: newType,
                        input_source: newType === 'resume_screen' ? 'excel_upload' : editingRound.input_source,
                      });
                    }}
                  >
                    <SelectTrigger className="bg-background-elevated">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUND_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className="h-4 w-4 text-primary" />
                            <span>{t.label}</span>
                          </div>
                        </SelectItem>
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
                        type="button"
                        onClick={() => updateRound(editingRound.id, { input_source: src.value })}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all cursor-pointer',
                          editingRound.input_source === src.value
                            ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary/40'
                            : 'border-border bg-background-elevated text-muted-foreground hover:border-primary/40 hover:text-foreground',
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
                    <p className="text-xs text-muted-foreground">
                      {editingRound.ai_scored
                        ? 'Let AI evaluate, benchmark, and score this round'
                        : 'Manual recruiter evaluation (automated AI scoring turned off)'}
                    </p>
                  </div>
                  <Switch
                    id="round-ai-scored-switch"
                    checked={editingRound.ai_scored}
                    onCheckedChange={(checked) => updateRound(editingRound.id, { ai_scored: checked })}
                  />
                </div>

                {/* Cutoff Threshold */}
                <div className="space-y-3 rounded-xl border border-border bg-background-elevated p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        <Sliders className="h-4 w-4 text-primary" /> Cutoff Threshold
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {editingRound.cutoff_threshold > 0 || (editingRound.cutoff_type === 'count' && (editingRound.cutoff_count || 0) > 0)
                          ? editingRound.cutoff_type === 'count'
                            ? `Filter down to top ${editingRound.cutoff_count || 300} resumes`
                            : `Candidates scoring below ${editingRound.cutoff_threshold}% will fail this round`
                          : 'No cutoff threshold required (pass through)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="cutoff-toggle" className="text-xs text-muted-foreground cursor-pointer">
                        {editingRound.cutoff_threshold > 0 || (editingRound.cutoff_type === 'count' && (editingRound.cutoff_count || 0) > 0)
                          ? 'Enabled'
                          : 'Disabled'}
                      </Label>
                      <Switch
                        id="cutoff-toggle"
                        checked={
                          editingRound.cutoff_threshold > 0 ||
                          (editingRound.cutoff_type === 'count' && (editingRound.cutoff_count || 0) > 0)
                        }
                        onCheckedChange={(enabled) => {
                          if (enabled) {
                            if (editingRound.cutoff_type === 'count') {
                              updateRound(editingRound.id, { cutoff_count: 300, cutoff_threshold: 0 });
                            } else {
                              updateRound(editingRound.id, { cutoff_threshold: 60, cutoff_count: null });
                            }
                          } else {
                            updateRound(editingRound.id, { cutoff_threshold: 0, cutoff_count: null });
                          }
                        }}
                      />
                    </div>
                  </div>

                  {(editingRound.cutoff_threshold > 0 ||
                    (editingRound.cutoff_type === 'count' && (editingRound.cutoff_count || 0) > 0)) && (
                    <div className="pt-2 space-y-3 border-t border-border/40">
                      {/* Metric Selector: Percentage (%) vs Number of Resumes */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Cutoff Filter Type</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateRound(editingRound.id, {
                                cutoff_type: 'percentage',
                                cutoff_threshold: editingRound.cutoff_threshold > 0 ? editingRound.cutoff_threshold : 60,
                              })
                            }
                            className={cn(
                              'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all cursor-pointer',
                              editingRound.cutoff_type !== 'count'
                                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                : 'border-border/60 bg-background hover:bg-muted text-muted-foreground',
                            )}
                          >
                            <Percent className="h-3.5 w-3.5" />
                            <span>Score Percentage (%)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateRound(editingRound.id, {
                                cutoff_type: 'count',
                                cutoff_count: editingRound.cutoff_count || 300,
                              })
                            }
                            className={cn(
                              'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all cursor-pointer',
                              editingRound.cutoff_type === 'count'
                                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                : 'border-border/60 bg-background hover:bg-muted text-muted-foreground',
                            )}
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>Number of Resumes</span>
                          </button>
                        </div>
                      </div>

                      {/* Score Percentage (%) Controls */}
                      {editingRound.cutoff_type !== 'count' ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Minimum Pass Benchmark:</span>
                            <span className="font-semibold text-primary">{editingRound.cutoff_threshold}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={1}
                              max={100}
                              value={editingRound.cutoff_threshold}
                              onChange={(e) =>
                                updateRound(editingRound.id, { cutoff_threshold: Number(e.target.value) })
                              }
                              className="w-full accent-primary cursor-pointer"
                            />
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={editingRound.cutoff_threshold}
                              onChange={(e) => {
                                const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                updateRound(editingRound.id, { cutoff_threshold: val });
                              }}
                              className="w-16 h-8 text-center text-xs"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Candidates scoring below {editingRound.cutoff_threshold}% will fail this round.
                          </p>
                        </div>
                      ) : (
                        /* Number of Resumes (Count) Controls */
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Filter Target (Top Candidates):</span>
                            <span className="font-semibold text-primary">
                              {editingRound.cutoff_count || 300} resumes
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              min={1}
                              max={50000}
                              placeholder="e.g. 300"
                              value={editingRound.cutoff_count ?? 300}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value) || 1);
                                updateRound(editingRound.id, { cutoff_count: val });
                              }}
                              className="w-36 h-9 font-medium text-sm"
                            />
                            <span className="text-xs text-muted-foreground">resumes to filter / advance</span>
                          </div>
                          {/* Quick presets: 50, 100, 300, 500, 1000 */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-muted-foreground mr-1">Quick presets:</span>
                            {[50, 100, 300, 500, 1000].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => updateRound(editingRound.id, { cutoff_count: preset })}
                                className={cn(
                                  'px-2.5 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer',
                                  (editingRound.cutoff_count ?? 300) === preset
                                    ? 'border-primary bg-primary/20 text-primary font-semibold'
                                    : 'border-border bg-background-elevated hover:bg-muted text-muted-foreground',
                                )}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Filter down to the top {editingRound.cutoff_count || 300} resumes for this round.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mail template */}
                <div className="space-y-2">
                  <Label htmlFor="round-mail-template">Mail template</Label>
                  <Textarea
                    id="round-mail-template"
                    value={editingRound.mail_template}
                    onChange={(e) => updateRound(editingRound.id, { mail_template: e.target.value })}
                    className="bg-background-elevated min-h-[90px] font-sans text-sm leading-relaxed resize-none"
                    placeholder="Hi {{name}}, your {{role}} evaluation is ready."
                  />
                  <p className="text-xs text-muted-foreground">Variables: {'{{name}}'}, {'{{role}}'}, {'{{round_name}}'}, {'{{gap_summary}}'}</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="destructive" onClick={() => removeRound(editingRound.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove Round
                </Button>
                <GlowButton type="button" onClick={() => setEditingRoundId(null)}>Done</GlowButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
