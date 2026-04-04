'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface FileUploaderProps {
  accountId: string;
  accountName?: string;
  inline?: boolean;
  onUploadComplete: (result: {
    fileName: string;
    fileType: string;
    extractedText: string;
    summary: Record<string, unknown>;
  }) => void;
}

export function FileUploader({ accountId, accountName, inline, onUploadComplete }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState('');
  const [uploading, setUploading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setNeedsPassword(false);
      setPassword('');
    }
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
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const fileType = ext === 'pdf' ? 'pdf' : ext === 'csv' ? 'csv' : 'xlsx';

      setStep('Parsing document...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      if (password) formData.append('password', password);

      const parseRes = await fetch('/api/parse-document', { method: 'POST', body: formData });
      const parseJson = await parseRes.json();

      if (!parseJson.success) {
        if (parseJson.error === 'PASSWORD_REQUIRED') {
          setNeedsPassword(true);
          setUploading(false);
          setStep('');
          toast.error('This PDF is password-protected. Please enter the password.');
          return;
        }
        throw new Error(parseJson.error ?? 'Parse failed');
      }

      setNeedsPassword(false);
      setStep('Analyzing with AI...');
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

      onUploadComplete({
        fileName: file.name,
        fileType,
        extractedText: parseJson.extractedText,
        summary: analyzeJson.summary,
      });

      toast.success('Statement processed successfully');
      setFile(null);
      setPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setStep('');
    }
  };

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
                ? 'Drop file here...'
                : 'Drag & drop a bank statement here, or click to browse'}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              PDF, Excel, or CSV (max 10MB)
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              {isDragActive
                ? 'Drop file here...'
                : 'Drag & drop a bank statement, or click to browse'}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              PDF, Excel, or CSV (max 10MB)
            </p>
          </>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
          <FileText className="h-5 w-5 text-primary" />
          <span className="flex-1 text-sm truncate">{file.name}</span>
          <button
            onClick={() => { setFile(null); setNeedsPassword(false); setPassword(''); }}
            className="p-1 hover:bg-bg-hover rounded cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {needsPassword && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <Lock className="h-4 w-4 text-warning shrink-0" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter PDF password"
            className="flex-1 px-2 py-1.5 text-sm border border-border rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
            onKeyDown={(e) => { if (e.key === 'Enter' && password) handleUpload(); }}
          />
        </div>
      )}

      {uploading && step && (
        <p className="text-sm text-primary-light font-medium animate-pulse">{step}</p>
      )}

      <Button
        onClick={handleUpload}
        loading={uploading}
        disabled={!file || (needsPassword && !password)}
        className="w-full"
      >
        Upload & Analyze
      </Button>
    </div>
  );
}
