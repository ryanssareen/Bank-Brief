'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, Upload, ArrowLeft, Download, ArrowUpToLine } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { Account, CategoryRule } from '@/types';

export default function CategoryMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = use(params);
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      doc(db, 'users', user.uid, 'accounts', accountId),
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as Account;
          setAccount(data);
          setRules(data.categoryMap ?? []);
        }
        setLoading(false);
      }
    );
    return unsub;
  }, [user?.uid, accountId]);

  const addRule = () => {
    setRules((prev) => [...prev, { keyword: '', category: '', subcategory: '' }]);
  };

  const removeRule = (idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveToTop = (idx: number) => {
    setRules((prev) => {
      const rule = prev[idx];
      return [rule, ...prev.filter((_, i) => i !== idx)];
    });
  };

  const updateRule = (idx: number, field: keyof CategoryRule, value: string) => {
    setRules((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      const parsed: CategoryRule[] = [];

      for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (i === 0 && cols[0]?.toLowerCase() === 'keyword') continue;
        if (cols.length >= 2 && cols[0]) {
          parsed.push({
            keyword: cols[0],
            category: cols[1] || 'Other',
            subcategory: cols[2] || '',
          });
        }
      }

      if (parsed.length === 0) {
        toast.error('No valid rows found. Expected: keyword, category, subcategory');
        return;
      }

      setRules((prev) => [...prev, ...parsed]);
      toast.success(`Loaded ${parsed.length} rules`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCSV = () => {
    if (rules.length === 0) return;
    const headers = 'keyword,category,subcategory';
    const rows = rules.map((r) =>
      `${r.keyword},${r.category},${r.subcategory ?? ''}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account?.name ?? 'account'}-category-map.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = useCallback(async () => {
    if (!user?.uid) return;
    const valid = rules
      .filter((r) => r.keyword && r.category)
      .map((r) => ({
        keyword: r.keyword,
        category: r.category,
        subcategory: r.subcategory || '',
      }));
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'accounts', accountId), {
        categoryMap: valid,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Saved ${valid.length} category rules`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [user?.uid, accountId, rules]);

  return (
    <AppShell>
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href={`/accounts/${accountId}`}
                  className="p-2 rounded-lg hover:bg-bg-muted transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-text-secondary" />
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">Category Map</h1>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {account?.name} &middot; {account?.bankName}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
                {rules.length > 0 && (
                  <Button variant="secondary" size="md" onClick={handleExportCSV}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                )}
                <Button size="md" onClick={handleSave} loading={saving}>
                  Save Rules
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
              </div>
            </div>

            <Card>
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 text-xs font-medium text-text-secondary px-1 border-b border-border pb-2">
                  <span>Keyword</span>
                  <span>Category</span>
                  <span>Subcategory</span>
                  <span className="w-9" />
                  <span className="w-9" />
                </div>

                {rules.map((rule, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-center">
                    <Input
                      placeholder="e.g. SWIGGY"
                      value={rule.keyword}
                      onChange={(e) => updateRule(idx, 'keyword', e.target.value)}
                    />
                    <Input
                      placeholder="Food & Dining"
                      value={rule.category}
                      onChange={(e) => updateRule(idx, 'category', e.target.value)}
                    />
                    <Input
                      placeholder="optional"
                      value={rule.subcategory ?? ''}
                      onChange={(e) => updateRule(idx, 'subcategory', e.target.value)}
                      maxLength={100}
                    />
                    <button
                      onClick={() => moveToTop(idx)}
                      disabled={idx === 0}
                      title="Move to top"
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
                    >
                      <ArrowUpToLine className="h-4 w-4 text-text-secondary hover:text-primary" />
                    </button>
                    <button
                      onClick={() => removeRule(idx)}
                      className="p-2 hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={addRule}
                  className="flex items-center gap-2 w-full px-4 py-3 border-2 border-dashed border-border rounded-lg text-sm text-text-secondary hover:border-primary-light hover:text-primary transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Rule
                </button>

                {rules.length === 0 && (
                  <div className="text-center py-8 text-sm text-text-secondary">
                    No rules yet. Add a row or import a CSV file.
                    <br />
                    <span className="text-xs">CSV format: keyword, category, subcategory</span>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
