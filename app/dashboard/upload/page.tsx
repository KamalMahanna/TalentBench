'use client';

import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  UploadCloud, FileSpreadsheet, FileText, X, CheckCircle2,
  AlertCircle, Loader2, ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { GlowButton } from '@/components/glow-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface FileStatus {
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'processing' | 'done' | 'error';
}

export default function BulkUploadPage() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') ?? '';
  const [roleId, setRoleId] = useState(initialRole);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ uploaded: number; failed: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.getRoles(),
  });
  const roles = rolesData?.data ?? [];

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: FileStatus[] = Array.from(fileList).map((f) => ({
      name: f.name,
      size: f.size,
      progress: 0,
      status: 'pending' as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (!roleId) {
      toast.error('Please select a role');
      return;
    }
    if (files.length === 0) {
      toast.error('Please add files to upload');
      return;
    }

    setUploading(true);
    setResult(null);
    setFiles((prev) => prev.map((f) => ({ ...f, status: 'processing' as const, progress: 0 })));

    try {
      const res = await api.bulkUpload(
        roleId,
        files.map((f) => ({ name: f.name, size: f.size })),
        (fileName, progress, status) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.name === fileName ? { ...f, progress, status } : f,
            ),
          );
        },
      );
      setResult(res.data);
      toast.success(`Upload complete: ${res.data.uploaded} processed, ${res.data.failed} failed`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Bulk Upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload resumes or Excel files to add candidates to a role</p>
      </div>

      {/* Role selector */}
      <div className="mb-6">
        <Label className="mb-2 block">Select role</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger className="bg-background-elevated">
            <SelectValue placeholder="Choose a role..." />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 text-center transition-all',
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <motion.div
          animate={{ y: dragActive ? -4 : 0 }}
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          <UploadCloud className="h-8 w-8" />
        </motion.div>
        <h3 className="font-display text-lg font-semibold">Drop files here or click to browse</h3>
        <p className="mt-1 text-sm text-muted-foreground">Supports .xlsx, .csv, .pdf, .doc, .docx</p>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-2"
          >
            {files.map((file, i) => (
              <motion.div
                key={`${file.name}-${i}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass flex items-center gap-4 rounded-xl p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {file.name.endsWith('.xlsx') || file.name.endsWith('.csv') ? (
                    <FileSpreadsheet className="h-5 w-5 text-success" />
                  ) : (
                    <FileText className="h-5 w-5 text-chart-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  {/* Progress bar */}
                  {file.status === 'processing' || file.status === 'done' || file.status === 'error' ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        animate={{ width: `${file.progress}%` }}
                        className={cn(
                          'h-full rounded-full',
                          file.status === 'error' ? 'bg-destructive' : file.status === 'done' ? 'bg-success' : 'bg-primary',
                        )}
                      />
                    </div>
                  ) : null}
                </div>
                {/* Status icon */}
                <div className="shrink-0">
                  {file.status === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  {file.status === 'done' && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {file.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                  {file.status === 'pending' && !uploading && (
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-muted-foreground hover:text-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload button */}
      {files.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{files.length} files ready</span>
          <GlowButton onClick={handleUpload} disabled={uploading || !roleId}>
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <>Start upload <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </GlowButton>
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 glass-strong rounded-2xl p-6 text-center"
          >
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
            <h3 className="font-display text-lg font-semibold">Upload Complete</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.uploaded} candidates processed successfully
              {result.failed > 0 && `, ${result.failed} failed`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
