'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CategoryRule } from '@/types';

interface CategoryMapModalProps {
  open: boolean;
  onClose: () => void;
  rules: CategoryRule[];
  onSave: (rules: CategoryRule[]) => Promise<void>;
}

export function CategoryMapModal({ open, onClose, rules: initialRules, onSave }: CategoryMapModalProps) {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRules(initialRules.length > 0 ? initialRules : []);
  }, [initialRules]);

  const addRule = () => {
    setRules((prev) => [...prev, { keyword: '', category: '', subcategory: '' }]);
  };

  const removeRule = (idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx));
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

      setRules(parsed);
      toast.success(`Loaded ${parsed.length} rules`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    const valid = rules
      .filter((r) => r.keyword && r.category)
      .map((r) => ({
        keyword: r.keyword,
        category: r.category,
        subcategory: r.subcategory || '',
      }));
    setLoading(true);
    try {
      await onSave(valid);
      toast.success(`Saved ${valid.length} category rules`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Category Mapping">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Define rules to automatically categorize transactions. If a transaction description
          contains the keyword, it gets the mapped category and subcategory.
        </p>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={addRule}>
            <Plus className="h-3.5 w-3.5" />
            Add Rule
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
        </div>

        {rules.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-text-secondary px-1">
              <span>Keyword</span>
              <span>Category</span>
              <span>Subcategory</span>
              <span />
            </div>
            {rules.map((rule, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
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
                />
                <button
                  onClick={() => removeRule(idx)}
                  className="p-1.5 hover:bg-bg-muted rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </button>
              </div>
            ))}
          </div>
        )}

        {rules.length === 0 && (
          <div className="text-center py-6 text-sm text-text-secondary">
            No rules yet. Add manually or import a CSV file.
            <br />
            <span className="text-xs">CSV format: keyword, category, subcategory</span>
          </div>
        )}

        <Button onClick={handleSave} loading={loading} className="w-full">
          Save Rules
        </Button>
      </div>
    </Modal>
  );
}
