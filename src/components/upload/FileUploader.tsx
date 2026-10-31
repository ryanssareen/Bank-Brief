'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export interface UploadResult {
  fileName: string;
  fileType: string;
  extractedText: string;
  summary: Record<string, unknown>;
}

/** 'saved' when the file became its own statement, 'duplicate' when every transaction was already loaded. */
export type UploadOutcome = 'saved' | 'duplicate';

interface FileUploaderProps {
  accountId: string;
  accountName?: string;
  inline?: boolean;
  /** Called once per file, in order. Each file is stored as its own statement. */
  onUploadComplete: (result: UploadResult) => Promise<UploadOutcome | void> | UploadOutcome | void;
  /** Called after a batch finishes with every file processed (none left needing a password or retry). */
  onAllComplete?: () => void;
}

type QueuedStatus = 'pending' | 'processing' | 'done' | 'duplicate' | 'password' | 'error';

interface QueuedFile {
  id: string;
  file: File;
  status: QueuedStatus;
  password: string;
  error?: string;
}

const MAX_FILES = 20;

function fileTypeOf(file: File): 'pdf' | 'csv' | 'xlsx' {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'pdf' ? 'pdf' : ext === 'csv' ? 'csv' : 'xlsx';
}

export function FileUploader({ accountId, accountName, inline, onUploadComplete, onAllComplete }: FileUploaderProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [step, setStep] = useState('');
  const [uploading, setUploading] = useState(false);

  const patch = (id: string, changes: Partial<QueuedFile>) =>
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...changes } : q)));

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length === 0) return;
    setQueue((prev) => {
      // Drop finished entries and skip files already queued (same name, size and modified time).
      const active = prev.filter((q) => q.status !== 'done' && q.status !== 'duplicate');
      const seen = new Set(active.map((q) => `${q.file.name}|${q.file.size}|${q.file.lastModified}`));
      const added: QueuedFile[] = [];
      for (const file of accepted) {
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (seen.has(key)) continue;
        seen.add(key);
        added.push({ id: `${key}|${Math.random().toString(36).slice(2)}`, file, status: 'pending', password: '' });
      }
      const next = [...active, ...added];
      if (next.length > MAX_FILES) {
        toast.error(`You can upload up to ${MAX_FILES} files at a time`);
        return next.slice(0, MAX_FILES);
      }
      return next;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    disabled: uploading,
    onDropRejected: (rejections) => {
      for (const r of rejections) toast.error(`${r.file.name}: ${r.errors[0]?.message ?? 'not accepted'}`);
    },
  });

  /** Parse, analyse and save one file. Returns its final status. */
  const processFile = async (item: QueuedFile, label: string): Promise<QueuedStatus> => {
    const fileType = fileTypeOf(item.file);
    patch(item.id, { status: 'processing', error: undefined });

    try {
      setStep(`${label}Parsing ${item.file.name}...`);
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('fileType', fileType);
      if (item.password) formData.append('password', item.password);

      const parseRes = await fetch('/api/parse-document', { method: 'POST', body: formData });
      const parseJson = await parseRes.json();

      if (!parseJson.success) {
        if (parseJson.error === 'PASSWORD_REQUIRED') {
          patch(item.id, { status: 'password', error: item.password ? 'Incorrect password' : undefined });
          return 'password';
        }
        throw new Error(parseJson.error ?? 'Parse failed');
      }

      setStep(`${label}Analyzing ${item.file.name} with AI...`);
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedText: parseJson.extractedText,
          parsed: parseJson.parsed ?? null,
          accountName: accountName ?? accountId,
          currency: 'INR',
        }),
      });
      const analyzeJson = await analyzeRes.json();
      if (!analyzeJson.success) throw new Error(analyzeJson.error ?? 'Analysis failed');

      const outcome = await onUploadComplete({
        fileName: item.file.name,
        fileType,
        extractedText: parseJson.extractedText,
        summary: analyzeJson.summary,
      });
      const status: QueuedStatus = outcome === 'duplicate' ? 'duplicate' : 'done';
      patch(item.id, { status });
      return status;
    } catch (err) {
      patch(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed' });
      return 'error';
    }
  };

  const handleUpload = async () => {
    // Pending and failed files are (re)tried; password-protected ones only once a password is entered.
    const todo = queue.filter(
      (q) => q.status === 'pending' || q.status === 'error' || (q.status === 'password' && q.password)
    );
    if (todo.length === 0) return;
    setUploading(true);

    const results: QueuedStatus[] = [];
    try {
      // One at a time, so each file is checked for duplicates against the ones saved before it.
      for (let i = 0; i < todo.length; i++) {
        const label = todo.length > 1 ? `(${i + 1}/${todo.length}) ` : '';
        results.push(await processFile(todo[i], label));
      }
    } finally {
      setUploading(false);
      setStep('');
    }

    const saved = results.filter((r) => r === 'done').length;
    const duplicates = results.filter((r) => r === 'duplicate').length;
    const needPassword = results.filter((r) => r === 'password').length;
    const failed = results.filter((r) => r === 'error').length;

    if (saved > 0) toast.success(saved === 1 ? 'Statement processed successfully' : `${saved} statements processed — each saved as its own file`);
    if (duplicates > 0) toast(`${duplicates} file(s) skipped — all transactions already loaded`);
    if (needPassword > 0) toast.error(`${needPassword} file(s) are password-protected. Enter the password and upload again.`);
    if (failed > 0) toast.error(`${failed} file(s) failed. See the list for details.`);

    // Files left in the queue were never part of this batch only if they still need a password.
    const untouchedWaiting = queue.some((q) => q.status === 'password' && !q.password && !todo.includes(q));
    if (needPassword === 0 && failed === 0 && !untouchedWaiting) {
      setQueue([]);
      onAllComplete?.();
    }
  };

  const removeFile = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id));

  const actionable = queue.filter(
    (q) => q.status === 'pending' || q.status === 'error' || (q.status === 'password' && q.password)
  ).length;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl ${inline ? 'p-12' : 'p-8'} text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary-light bg-info/10' : 'border-border hover:border-primary-light'}`}
      >
        <input {...getInputProps()} />
        <Upload className={`${inline ? 'h-12 w-12' : 'h-8 w-8'} mx-auto text-text-secondary mb-3`} />
        {inline ? (
          <>
            <p className="text-lg font-medium text-text-primary">No statements yet</p>
            <p className="text-sm text-text-secondary mt-1">
              {isDragActive
                ? 'Drop files here...'
                : 'Drag & drop one or more bank statements here, or click to browse'}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-secondary">
            {isDragActive
              ? 'Drop files here...'
              : 'Drag & drop one or more statements, or click to browse'}
          </p>
        )}
        <p className="text-xs text-text-secondary mt-1">
          PDF, Excel, or CSV (max 10MB each). Each file is kept as its own statement.
        </p>
      </div>

      {queue.length > 0 && (
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {queue.map((q) => (
            <li key={q.id} className="p-3 bg-bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-3">
                {q.status === 'processing' ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                ) : q.status === 'done' || q.status === 'duplicate' ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : q.status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-danger shrink-0" />
                ) : q.status === 'password' ? (
                  <Lock className="h-5 w-5 text-warning shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{q.file.name}</p>
                  {q.status === 'duplicate' && (
                    <p className="text-xs text-text-secondary">Skipped — all transactions already loaded</p>
                  )}
                  {q.status === 'done' && <p className="text-xs text-text-secondary">Saved</p>}
                  {q.error && <p className="text-xs text-danger truncate">{q.error}</p>}
                </div>
                {!uploading && (
                  <button
                    onClick={() => removeFile(q.id)}
                    className="p-1 hover:bg-bg-hover rounded cursor-pointer"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {q.status === 'password' && (
                <input
                  type="password"
                  value={q.password}
                  onChange={(e) => patch(q.id, { password: e.target.value, error: undefined })}
                  placeholder="Enter PDF password"
                  disabled={uploading}
                  className="w-full px-2 py-1.5 text-sm border border-warning/40 rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
                  onKeyDown={(e) => { if (e.key === 'Enter' && q.password) handleUpload(); }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {uploading && step && (
        <p className="text-sm text-primary-light font-medium animate-pulse">{step}</p>
      )}

      <Button
        onClick={handleUpload}
        loading={uploading}
        disabled={actionable === 0}
        className="w-full"
      >
        {actionable > 1 ? `Upload & Analyze ${actionable} files` : 'Upload & Analyze'}
      </Button>
    </div>
  );
}
