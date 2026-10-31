'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, Upload, ArrowUpToLine, RotateCcw, FileSpreadsheet, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportCategoryMapXLSX, parseCSVLine } from '@/utils/exportData';
import type { CategoryRule } from '@/types';

export default function CategoryMapPage() {
  const { user } = useAuth();
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.uid) {
      setRules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRules((data.categoryMap as CategoryRule[]) ?? []);
        }
        setLoading(false);
      },
      (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load category map');
        setLoading(false);
      }
    );
    return unsub;
  }, [user?.uid]);

  const searchTerms = useMemo(() => search.toLowerCase().split(/\s+/).filter(Boolean), [search]);
  const isVisible = (r: CategoryRule) => {
    if (searchTerms.length === 0) return true;
    const hay = `${r.keyword} ${r.category} ${r.subcategory ?? ''}`.toLowerCase();
    return searchTerms.every((t) => hay.includes(t));
  };
  const visibleCount = rules.filter(isVisible).length;

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
      const text = (ev.target?.result as string).replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const parsed: CategoryRule[] = [];

      for (let i = 0; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
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

  const handleExportExcel = async () => {
    if (rules.length === 0) return;
    try {
      await exportCategoryMapXLSX(rules);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export Excel file');
    }
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
      await updateDoc(doc(db, 'users', user.uid), {
        categoryMap: valid,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Saved ${valid.length} category rules`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [user?.uid, rules]);

  const closeResetModal = useCallback(() => {
    if (!resetting) setResetOpen(false);
  }, [resetting]);

  const handleResetAll = async () => {
    if (!user?.uid) return;
    setResetting(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        categoryMap: [],
        updatedAt: serverTimestamp(),
      });
      setRules([]);
      setResetOpen(false);
      toast.success('All category rules cleared');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset rules');
    } finally {
      setResetting(false);
    }
  };

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
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">Category Map</h1>
                <p className="text-sm text-text-secondary mt-0.5">
                  Shared across all accounts
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
                {rules.length > 0 && (
                  <Button variant="secondary" size="md" onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel
                  </Button>
                )}
                {rules.length > 0 && (
                  <Button variant="secondary" size="md" onClick={() => setResetOpen(true)}>
                    <RotateCcw className="h-4 w-4" />
                    Reset All
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

                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search keyword, category or subcategory..."
                      className="w-full pl-9 pr-9 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary focus:outline-none focus:border-primary"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" aria-label="Clear search">
                        <X className="h-4 w-4 text-text-secondary" />
                      </button>
                    )}
                  </div>
                  {searchTerms.length > 0 && (
                    <span className="text-xs text-text-secondary">Showing {visibleCount} of {rules.length} rules</span>
                  )}
                </div>

                {rules.map((rule, idx) => !isVisible(rule) ? null : (
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

      <Modal open={resetOpen} onClose={closeResetModal} title="Reset all category rules?">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This permanently deletes all {rules.length} category{' '}
            {rules.length === 1 ? 'rule' : 'rules'}. It applies to every account and credit card,
            and can&apos;t be undone. Consider exporting an Excel backup first.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeResetModal} disabled={resetting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleResetAll} loading={resetting}>
              <Trash2 className="h-4 w-4" />
              Delete all rules
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
