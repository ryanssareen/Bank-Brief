'use client';

import { useState, useEffect, useCallback, useMemo, use, useRef } from 'react';
import { doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { AccountSummary } from '@/components/accounts/AccountSummary';
import { EditCreditCardModal } from '@/components/credit-cards/EditCreditCardModal';

import { FileUploader } from '@/components/upload/FileUploader';
import { SpendingBarChart } from '@/components/charts/SpendingBarChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { MonthlyComparisonChart } from '@/components/charts/MonthlyComparisonChart';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { useAuth } from '@/hooks/useAuth';
import { formatINR } from '@/utils/formatCurrency';
import { Upload, Mail, Pencil, ListFilter, Layers, Download, Trash2, RefreshCw, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { exportSummaryCSV } from '@/utils/exportData';
import toast from 'react-hot-toast';
import type { CreditCard, Statement, StatementSummary, Transaction, CategoryRule } from '@/types';

type FilterKey = 'date' | 'description' | 'type' | 'accountName' | 'keyword' | 'category' | 'subcategory' | 'disposition';

const emptyFilters = (): Record<FilterKey, Set<string>> => ({
  date: new Set(),
  description: new Set(),
  type: new Set(),
  accountName: new Set(),
  keyword: new Set(),
  category: new Set(),
  subcategory: new Set(),
  disposition: new Set(),
});

function ColumnFilterDropdown({
  label,
  values,
  selected,
  onChange,
  align = 'left',
}: {
  label: string;
  values: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isFiltered = selected.size > 0 && selected.size < values.length;

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        onClick={() => setOpen((p) => !p)}
        className={`p-0.5 rounded transition-colors cursor-pointer ${isFiltered ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
      >
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className={`absolute top-full mt-1 ${align === 'right' ? 'right-0' : 'left-0'} z-50 bg-bg-card border border-border rounded-lg shadow-lg p-2 min-w-[160px] max-h-48 overflow-y-auto`}>
          <div className="flex gap-2 mb-2 border-b border-border pb-2">
            <button
              onClick={() => onChange(new Set(values))}
              className="text-[10px] text-primary hover:underline cursor-pointer"
            >
              All
            </button>
            <button
              onClick={() => onChange(new Set())}
              className="text-[10px] text-primary hover:underline cursor-pointer"
            >
              None
            </button>
          </div>
          {values.map((v) => (
            <label key={v} className="flex items-center gap-2 px-1 py-0.5 hover:bg-bg-muted rounded cursor-pointer text-xs text-text-primary">
              <input
                type="checkbox"
                checked={selected.has(v)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(v);
                  else next.delete(v);
                  onChange(next);
                }}
                className="rounded border-border"
              />
              {v || '(blank)'}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreditCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: cardId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [card, setCard] = useState<CreditCard | null>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'insights'>('overview');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<FilterKey, Set<string>>>(emptyFilters);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [catSuggestion, setCatSuggestion] = useState<{
    keyword: string;
    category: string;
    subcategory: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const userUnsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCategoryRules((data.categoryMap as CategoryRule[]) ?? []);
        }
      }
    );

    const cardUnsub = onSnapshot(
      doc(db, 'users', user.uid, 'creditCards', cardId),
      (snap) => {
        if (snap.exists()) {
          setCard({ id: snap.id, ...snap.data() } as CreditCard);
        }
      }
    );

    const statementsUnsub = onSnapshot(
      query(
        collection(db, 'users', user.uid, 'creditCards', cardId, 'statements'),
        orderBy('uploadedAt', 'desc')
      ),
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          uploadedAt: d.data().uploadedAt?.toDate() ?? new Date(),
          summary: d.data().summary
            ? { ...d.data().summary, generatedAt: d.data().summary.generatedAt?.toDate() ?? new Date() }
            : undefined,
        })) as Statement[];
        setStatements(data);
        setLoading(false);
      }
    );

    return () => {
      userUnsub();
      cardUnsub();
      statementsUnsub();
    };
  }, [user?.uid, cardId]);

  const handleUploadComplete = useCallback(
    async (result: { fileName: string; fileType: string; extractedText: string; summary: Record<string, unknown> }) => {
      if (!user?.uid) return;

      const existingTxKeys = new Set<string>();
      for (const s of statements) {
        const sum = s.summary as StatementSummary | undefined;
        if (!sum?.transactions) continue;
        for (const t of sum.transactions) {
          existingTxKeys.add(`${t.date}|${t.amount}|${t.type}|${t.balance ?? ''}`);
        }
      }

      const rawSummary = result.summary as { transactions?: { date: string; description: string; amount: number; type: string; category: string; balance?: number }[] } & Record<string, unknown>;
      const allTx = rawSummary.transactions ?? [];
      const uniqueTx = allTx.filter(
        (t) => !existingTxKeys.has(`${t.date}|${t.amount}|${t.type}|${t.balance ?? ''}`)
      );

      if (uniqueTx.length === 0) {
        toast('All transactions already loaded — skipped duplicate statement');
        setShowUpload(false);
        return;
      }

      const totalCredits = uniqueTx.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
      const totalDebits = uniqueTx.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

      // Credit-card outstanding closing = opening + debits (spends) − credits (payments/refunds).
      // Never trust the model's closing figure: derive it from the opening balance and totals.
      const openingBalance = typeof rawSummary.openingBalance === 'number' ? rawSummary.openingBalance : 0;
      const closingBalance = Math.round((openingBalance + totalDebits - totalCredits) * 100) / 100;

      const catMap = new Map<string, number>();
      for (const t of uniqueTx) {
        if (t.type === 'debit') catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
      }
      const topCategories = [...catMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({ name, amount }));

      const deduped = {
        ...rawSummary,
        transactions: uniqueTx,
        totalCredits,
        totalDebits,
        openingBalance,
        closingBalance,
        topCategories,
      };

      await addDoc(
        collection(db, 'users', user.uid, 'creditCards', cardId, 'statements'),
        {
          fileName: result.fileName,
          fileType: result.fileType,
          uploadedAt: serverTimestamp(),
          periodStart: '',
          periodEnd: '',
          status: 'done',
          rawText: result.extractedText,
          summary: { ...deduped, generatedAt: serverTimestamp() },
        }
      );
      setShowUpload(false);
    },
    [user?.uid, cardId, statements]
  );

  const overallSummary = useMemo<StatementSummary | undefined>(() => {
    if (statements.length === 0) return undefined;
    const txMap = new Map<string, Transaction>();
    for (const s of statements) {
      const sum = s.summary as StatementSummary | undefined;
      if (!sum?.transactions) continue;
      for (const t of sum.transactions) {
        const key = `${t.date}|${t.amount}|${t.type}|${t.balance ?? ''}`;
        const existing = txMap.get(key);
        if (!existing || (t.category && !existing.category) || (t.disposition && !existing.disposition)) {
          txMap.set(key, t);
        }
      }
    }
    const allTx = [...txMap.values()].sort((a, b) => a.date.localeCompare(b.date));
    const totalCredits = allTx.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalDebits = allTx.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    const catMap = new Map<string, number>();
    for (const t of allTx) {
      if (t.type === 'debit') catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
    }
    const topCategories = [...catMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ name, amount }));

    // Credit-card outstanding: opening = stated opening of the earliest statement,
    // closing = opening + total debits − total credits across the whole period.
    const earliest = statements
      .map((s) => s.summary as StatementSummary | undefined)
      .filter((s): s is StatementSummary => !!s?.transactions?.length)
      .sort((a, b) => {
        const da = [...a.transactions].sort((x, y) => x.date.localeCompare(y.date))[0]?.date ?? '';
        const db = [...b.transactions].sort((x, y) => x.date.localeCompare(y.date))[0]?.date ?? '';
        return da.localeCompare(db);
      })[0];
    const openingBalance = earliest?.openingBalance ?? 0;
    const closingBalance = Math.round((openingBalance + totalDebits - totalCredits) * 100) / 100;

    const lastStmt = statements[0]?.summary as StatementSummary | undefined;
    return {
      totalCredits,
      totalDebits,
      openingBalance,
      closingBalance,
      topCategories,
      insights: lastStmt?.insights ?? [],
      transactions: allTx,
      generatedAt: new Date(),
    };
  }, [statements]);

  const currentStatement = statements[selectedIdx];
  const isOverall = selectedIdx === -1;
  const summary = isOverall ? overallSummary : (currentStatement?.summary as StatementSummary | undefined);

  const liveTopCategories = useMemo(() => {
    const txs = summary?.transactions ?? [];
    const catMap = new Map<string, number>();
    for (const t of txs) {
      if (t.type === 'debit') {
        const cat = t.category || 'Uncategorized';
        catMap.set(cat, (catMap.get(cat) ?? 0) + t.amount);
      }
    }
    return [...catMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ name, amount }));
  }, [summary?.transactions]);

  const getTxFilterValue = useCallback((t: Transaction, key: FilterKey): string => {
    switch (key) {
      case 'date': return t.date;
      case 'description': return t.description;
      case 'type': return t.type;
      case 'accountName': return card?.name ?? '';
      case 'keyword': return t.matchedKeyword ?? '';
      case 'category': return t.category ?? '';
      case 'subcategory': return t.subcategory ?? '';
      case 'disposition': return t.disposition ?? '';
    }
  }, [card?.name]);

  const filterUniqueValues = useMemo(() => {
    const txs = summary?.transactions ?? [];
    const allKeys: FilterKey[] = ['date', 'description', 'type', 'accountName', 'keyword', 'category', 'subcategory', 'disposition'];
    const result = {} as Record<FilterKey, string[]>;

    for (const key of allKeys) {
      // Filter transactions by all OTHER active filters (not this column's filter)
      const filtered = txs.filter((t) => {
        for (const otherKey of allKeys) {
          if (otherKey === key) continue;
          const selected = columnFilters[otherKey];
          if (selected.size === 0) continue;
          if (!selected.has(getTxFilterValue(t, otherKey))) return false;
        }
        return true;
      });
      result[key] = [...new Set(filtered.map((t) => getTxFilterValue(t, key)))].sort();
    }
    return result;
  }, [summary?.transactions, columnFilters, getTxFilterValue]);

  const filteredTransactions = useMemo(() => {
    const txs = summary?.transactions ?? [];
    const allKeys = Object.keys(columnFilters) as FilterKey[];
    return txs
      .map((t, originalIndex) => ({ t, originalIndex }))
      .filter(({ t }) => {
        for (const key of allKeys) {
          const selected = columnFilters[key];
          if (selected.size === 0) continue;
          if (!selected.has(getTxFilterValue(t, key))) return false;
        }
        return true;
      });
  }, [summary?.transactions, columnFilters, getTxFilterValue]);

  const updateFilter = useCallback((key: FilterKey, values: Set<string>) => {
    setColumnFilters((prev) => ({ ...prev, [key]: values }));
    setSelectedTxIndices(new Set());
  }, []);

  const handleEditSave = useCallback(
    async (_id: string, data: { name: string; bankName: string; cardNumber?: string; cardType: CreditCard['cardType'] }) => {
      if (!user?.uid) return;
      await updateDoc(doc(db, 'users', user.uid, 'creditCards', cardId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    [user?.uid, cardId]
  );

  const handleDeleteStatement = useCallback(
    async (statementId: string) => {
      if (!user?.uid) return;
      if (!confirm('Remove this statement? This cannot be undone.')) return;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'creditCards', cardId, 'statements', statementId));
        setSelectedIdx((prev) => {
          if (statements.length <= 2) return 0;
          return prev > 0 ? prev - 1 : -1;
        });
        toast.success('Statement removed');
      } catch {
        toast.error('Failed to remove statement');
      }
    },
    [user?.uid, cardId, statements.length]
  );

  const extractKeyword = useCallback((description: string): string => {
    const stopWords = new Set([
      'dr', 'cr', 'imps', 'neft', 'upi', 'rtgs', 'p2a', 'p2m', 'ach',
      'the', 'to', 'from', 'for', 'and', 'of', 'in', 'a', 'an', 'no',
      'trf', 'ref', 'txn', 'chrg', 'charges', 'charge',
    ]);
    const words = description
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));
    return words[0]?.toUpperCase() ?? '';
  }, []);

  const handleUpdateTransaction = useCallback(
    async (txIdx: number, field: keyof Transaction, value: string) => {
      if (!user?.uid) return;

      const txToUpdate = summary?.transactions?.[txIdx];
      if (!txToUpdate) return;

      let targetStmt: Statement | undefined;
      let targetTxIdx = -1;

      if (!isOverall && currentStatement) {
        targetStmt = currentStatement;
        targetTxIdx = txIdx;
      } else {
        const txKey = `${txToUpdate.date}|${txToUpdate.amount}|${txToUpdate.type}|${txToUpdate.balance ?? ''}`;
        for (const s of statements) {
          const sum = s.summary as StatementSummary | undefined;
          if (!sum?.transactions) continue;
          const idx = sum.transactions.findIndex((t) =>
            `${t.date}|${t.amount}|${t.type}|${t.balance ?? ''}` === txKey
          );
          if (idx !== -1) {
            targetStmt = s;
            targetTxIdx = idx;
            break;
          }
        }
      }

      if (!targetStmt || targetTxIdx === -1) return;
      const stmtSum = targetStmt.summary as StatementSummary;

      const updatedTx = stmtSum.transactions.map((t, i) =>
        i === targetTxIdx ? { ...t, [field]: value } : t
      );

      try {
        await updateDoc(
          doc(db, 'users', user.uid, 'creditCards', cardId, 'statements', targetStmt.id),
          { 'summary.transactions': updatedTx }
        );

        if ((field === 'category' || field === 'subcategory') && value) {
          const tx = updatedTx[targetTxIdx];
          const cat = tx.category;
          const sub = tx.subcategory ?? '';
          if (!cat) return;

          const keyword = extractKeyword(tx.description);
          if (!keyword) return;

          const existingRules = categoryRules ?? [];
          const alreadyMapped = existingRules.some(
            (r) => r.keyword.toLowerCase() === keyword.toLowerCase()
          );
          if (alreadyMapped) return;

          setCatSuggestion({
            keyword,
            category: cat,
            subcategory: sub,
            description: tx.description,
          });
        }
      } catch {
        toast.error('Failed to update transaction');
      }
    },
    [user?.uid, cardId, isOverall, currentStatement, summary, statements, categoryRules, extractKeyword]
  );

  const handleAcceptSuggestion = useCallback(async () => {
    if (!user?.uid || !catSuggestion) return;
    const existingRules = categoryRules ?? [];
    const newRules = [...existingRules, {
      keyword: catSuggestion.keyword,
      category: catSuggestion.category,
      subcategory: catSuggestion.subcategory,
    }];
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        categoryMap: newRules,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Added "${catSuggestion.keyword}" → "${catSuggestion.category}" to category map`);
    } catch {
      toast.error('Failed to add rule');
    }
    setCatSuggestion(null);
  }, [user?.uid, categoryRules, catSuggestion]);

  const handleAcceptAndApply = useCallback(async () => {
    if (!user?.uid || !catSuggestion) return;
    const existingRules = categoryRules ?? [];
    const newRules = [...existingRules, {
      keyword: catSuggestion.keyword,
      category: catSuggestion.category,
      subcategory: catSuggestion.subcategory,
    }];
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        categoryMap: newRules,
        updatedAt: serverTimestamp(),
      });

      let totalMatched = 0;
      for (const stmt of statements) {
        const sum = stmt.summary as StatementSummary | undefined;
        if (!sum?.transactions?.length) continue;
        const updatedTx = sum.transactions.map((t) => {
          if (t.disposition) return t;
          const descLower = t.description.toLowerCase();
          for (const rule of newRules) {
            if (descLower.includes(rule.keyword.toLowerCase())) {
              totalMatched++;
              return { ...t, category: rule.category, subcategory: rule.subcategory ?? '', matchedKeyword: rule.keyword };
            }
          }
          return { ...t, category: '', subcategory: '', matchedKeyword: '' };
        });
        await updateDoc(
          doc(db, 'users', user.uid, 'creditCards', cardId, 'statements', stmt.id),
          { 'summary.transactions': updatedTx }
        );
      }
      toast.success(`Added rule & updated ${totalMatched} transactions`);
    } catch {
      toast.error('Failed to add rule');
    }
    setCatSuggestion(null);
  }, [user?.uid, cardId, categoryRules, catSuggestion, statements]);

  const [applyingCategoryMap, setApplyingCategoryMap] = useState(false);
  const [selectedTxIndices, setSelectedTxIndices] = useState<Set<number>>(new Set());

  const handleApplyCategoryMap = useCallback(
    async () => {
      if (!user?.uid || !categoryRules?.length) {
        toast.error('No category map defined. Add rules first.');
        return;
      }

      setApplyingCategoryMap(true);
      try {
        const rules = categoryRules;
        let updated = 0;
        let totalMatched = 0;

        for (const stmt of statements) {
          const sum = stmt.summary as StatementSummary | undefined;
          if (!sum?.transactions?.length) continue;

          const updatedTx = sum.transactions.map((t) => {
            if (t.disposition) return t;

            const descLower = t.description.toLowerCase();
            for (const rule of rules) {
              if (descLower.includes(rule.keyword.toLowerCase())) {
                totalMatched++;
                return {
                  ...t,
                  category: rule.category,
                  subcategory: rule.subcategory ?? '',
                  matchedKeyword: rule.keyword,
                };
              }
            }

            return { ...t, category: '', subcategory: '', matchedKeyword: '' };
          });

          await updateDoc(
            doc(db, 'users', user.uid, 'creditCards', cardId, 'statements', stmt.id),
            { 'summary.transactions': updatedTx }
          );
          updated++;
        }
        toast.success(`Updated ${updated} statement(s) — ${totalMatched} transactions matched rules`);
      } catch {
        toast.error('Failed to apply category map');
      } finally {
        setApplyingCategoryMap(false);
      }
    },
    [user?.uid, cardId, categoryRules, statements]
  );

  const handleDeleteCard = useCallback(async () => {
    if (!user?.uid) return;
    if (!confirm('Are you sure you want to delete this credit card? All statements will be permanently lost.')) return;
    try {
      for (const stmt of statements) {
        await deleteDoc(doc(db, 'users', user.uid, 'creditCards', cardId, 'statements', stmt.id));
      }
      await deleteDoc(doc(db, 'users', user.uid, 'creditCards', cardId));
      toast.success('Credit card deleted');
      router.push('/credit-cards');
    } catch {
      toast.error('Failed to delete credit card');
    }
  }, [user?.uid, cardId, statements, router]);

  const handleBulkDisposition = useCallback(
    async (disposition: '' | 'Ok' | 'To Be Settled') => {
      if (!user?.uid || selectedTxIndices.size === 0) return;
      const allTx = summary?.transactions;
      if (!allTx) return;

      try {
        if (!isOverall && currentStatement) {
          const sum = currentStatement.summary as StatementSummary | undefined;
          if (!sum?.transactions) return;
          const updatedTx = sum.transactions.map((t, i) =>
            selectedTxIndices.has(i) ? { ...t, disposition } : t
          );
          await updateDoc(
            doc(db, 'users', user.uid, 'creditCards', cardId, 'statements', currentStatement.id),
            { 'summary.transactions': updatedTx }
          );
        } else {
          const stmtUpdates = new Map<string, { stmt: Statement; txs: Transaction[] }>();
          for (const idx of selectedTxIndices) {
            const tx = allTx[idx];
            if (!tx) continue;
            const txKey = `${tx.date}|${tx.amount}|${tx.type}|${tx.balance ?? ''}`;
            for (const s of statements) {
              const sSum = s.summary as StatementSummary | undefined;
              if (!sSum?.transactions) continue;
              const found = sSum.transactions.findIndex((t) =>
                `${t.date}|${t.amount}|${t.type}|${t.balance ?? ''}` === txKey
              );
              if (found !== -1) {
                if (!stmtUpdates.has(s.id)) {
                  stmtUpdates.set(s.id, { stmt: s, txs: [...sSum.transactions] });
                }
                const entry = stmtUpdates.get(s.id)!;
                entry.txs[found] = { ...entry.txs[found], disposition };
                break;
              }
            }
          }
          await Promise.all(
            [...stmtUpdates.entries()].map(([id, { txs }]) =>
              updateDoc(
                doc(db, 'users', user.uid!, 'creditCards', cardId, 'statements', id),
                { 'summary.transactions': txs }
              )
            )
          );
        }
        toast.success(`Updated disposition for ${selectedTxIndices.size} transaction(s)`);
        setSelectedTxIndices(new Set());
      } catch {
        toast.error('Failed to update dispositions');
      }
    },
    [user?.uid, cardId, isOverall, currentStatement, selectedTxIndices, summary?.transactions, statements]
  );

  const deduplicateStatements = useCallback(
    async () => {
      if (!user?.uid || statements.length === 0) return;

      for (const s of statements) {
        const sum = s.summary as StatementSummary | undefined;
        if (!sum?.transactions?.length) continue;
        const txMap = new Map<string, Transaction>();
        for (const t of sum.transactions) {
          const key = `${t.date}|${t.amount}|${t.type}|${t.balance ?? ''}`;
          const existing = txMap.get(key);
          if (!existing || (t.category && !existing.category) || (t.disposition && !existing.disposition)) {
            txMap.set(key, t);
          }
        }
        if (txMap.size < sum.transactions.length) {
          const cleanTx = [...txMap.values()].sort((a, b) => a.date.localeCompare(b.date));
          const totalCredits = cleanTx.filter((t) => t.type === 'credit').reduce((acc, t) => acc + t.amount, 0);
          const totalDebits = cleanTx.filter((t) => t.type === 'debit').reduce((acc, t) => acc + t.amount, 0);
          let openBal = sum.openingBalance;
          let closeBal = sum.closingBalance;
          if (cleanTx.length > 0 && cleanTx[0].balance != null) {
            const firstTx = cleanTx[0];
            openBal = firstTx.type === 'debit'
              ? firstTx.balance! + firstTx.amount
              : firstTx.balance! - firstTx.amount;
            closeBal = cleanTx[cleanTx.length - 1].balance ?? closeBal;
          }
          await updateDoc(
            doc(db, 'users', user.uid, 'creditCards', cardId, 'statements', s.id),
            {
              'summary.transactions': cleanTx,
              'summary.totalCredits': totalCredits,
              'summary.totalDebits': totalDebits,
              'summary.openingBalance': openBal,
              'summary.closingBalance': closeBal,
            }
          );
        }
      }

      if (statements.length < 2) return;

      const statementsWithKeys = statements
        .filter((s) => s.summary && (s.summary as StatementSummary).transactions?.length)
        .map((s) => {
          const txKeys = new Set(
            ((s.summary as StatementSummary).transactions ?? []).map(
              (t) => `${t.date}|${t.amount}|${t.type}|${t.balance ?? ''}`
            )
          );
          return { statement: s, txKeys };
        });

      for (let i = 0; i < statementsWithKeys.length; i++) {
        for (let j = i + 1; j < statementsWithKeys.length; j++) {
          const a = statementsWithKeys[i];
          const b = statementsWithKeys[j];
          const smaller = a.txKeys.size <= b.txKeys.size ? a : b;
          const larger = a.txKeys.size <= b.txKeys.size ? b : a;

          let overlap = 0;
          for (const key of smaller.txKeys) {
            if (larger.txKeys.has(key)) overlap++;
          }

          const overlapRatio = overlap / smaller.txKeys.size;
          if (overlapRatio < 0.8) continue;

          const mergedTxMap = new Map<string, Transaction>();
          for (const t of (larger.statement.summary as StatementSummary).transactions) {
            mergedTxMap.set(`${t.date}|${t.amount}|${t.type}|${t.balance ?? ''}`, t);
          }
          for (const t of (smaller.statement.summary as StatementSummary).transactions) {
            const key = `${t.date}|${t.amount}|${t.type}|${t.balance ?? ''}`;
            if (!mergedTxMap.has(key)) mergedTxMap.set(key, t);
          }

          const mergedTx = [...mergedTxMap.values()].sort((x, y) => x.date.localeCompare(y.date));
          const totalCredits = mergedTx.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
          const totalDebits = mergedTx.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
          const catMap = new Map<string, number>();
          for (const t of mergedTx) {
            if (t.type === 'debit') catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
          }
          const topCategories = [...catMap.entries()].sort((x, y) => y[1] - x[1]).map(([name, amount]) => ({ name, amount }));

          const keepRef = doc(db, 'users', user.uid, 'creditCards', cardId, 'statements', larger.statement.id);
          const removeRef = doc(db, 'users', user.uid, 'creditCards', cardId, 'statements', smaller.statement.id);

          const existingSummary = larger.statement.summary as StatementSummary;
          let mergedOpening = existingSummary.openingBalance;
          let mergedClosing = existingSummary.closingBalance;
          if (mergedTx.length > 0) {
            const firstTx = mergedTx[0];
            mergedOpening = firstTx.type === 'debit'
              ? (firstTx.balance ?? 0) + firstTx.amount
              : (firstTx.balance ?? 0) - firstTx.amount;
            mergedClosing = mergedTx[mergedTx.length - 1].balance ?? mergedClosing;
          }
          await updateDoc(keepRef, {
            summary: {
              ...existingSummary,
              transactions: mergedTx,
              totalCredits,
              totalDebits,
              topCategories,
              openingBalance: mergedOpening,
              closingBalance: mergedClosing,
            },
          });
          await deleteDoc(removeRef);
          return;
        }
      }
    },
    [user?.uid, cardId, statements]
  );

  useEffect(() => {
    if (statements.length === 0) return;
    deduplicateStatements();
  }, [statements.length, deduplicateStatements]);

  const handleSendEmail = async () => {
    if (!user?.email || !summary) return;
    setSendingEmail(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: user.email,
          recipientName: user.displayName ?? 'User',
          accountName: card?.name ?? 'Credit Card',
          summary,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success('Report sent to your email');
      else throw new Error(data.error);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
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
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-text-primary">
                    {card?.name ?? 'Credit Card'}
                  </h1>
                  {card?.cardType && (
                    <Badge variant="info">{card.cardType}</Badge>
                  )}
                  <button
                    onClick={() => setShowEdit(true)}
                    className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors cursor-pointer"
                    title="Edit credit card"
                  >
                    <Pencil className="h-4 w-4 text-text-secondary" />
                  </button>
                  <button
                    onClick={handleDeleteCard}
                    className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors cursor-pointer"
                    title="Delete credit card"
                  >
                    <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {card?.bankName && (
                    <p className="text-sm text-text-secondary">{card.bankName}</p>
                  )}
                  {card?.cardNumber && (
                    <p className="text-sm text-text-secondary">
                      &middot; Card: {card.cardNumber}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link href="/category-map">
                  <Button variant="secondary" size="md">
                    <ListFilter className="h-4 w-4" />
                    Category Map
                  </Button>
                </Link>
                {summary && (
                  <div className="relative group">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleApplyCategoryMap}
                      loading={applyingCategoryMap}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Update Category &amp; Subcategory
                    </Button>
                    <div className="absolute top-full mt-1 left-0 w-64 p-2 bg-bg-card border border-border rounded-lg shadow-lg text-xs text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Updates done for transactions with no Disposition, based on Category Map defined
                    </div>
                  </div>
                )}
                <Button onClick={() => setShowUpload(true)} size="md">
                  <Upload className="h-4 w-4" />
                  Upload Statement
                </Button>
                {summary && (
                  <>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => exportSummaryCSV(summary, card?.name ?? 'credit-card')}
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleSendEmail}
                      loading={sendingEmail}
                    >
                      <Mail className="h-4 w-4" />
                      Send Report
                    </Button>
                  </>
                )}
              </div>
            </div>

            {statements.length > 0 && (
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-text-secondary" />
                <select
                  value={selectedIdx}
                  onChange={(e) => { setSelectedIdx(Number(e.target.value)); setSelectedTxIndices(new Set()); setColumnFilters(emptyFilters()); }}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
                >
                  {statements.length > 1 && (
                    <option value={-1}>Overall (all statements merged)</option>
                  )}
                  {statements.map((s, i) => (
                    <option key={s.id} value={i}>{s.fileName}</option>
                  ))}
                </select>
                {!isOverall && currentStatement && (
                  <button
                    onClick={() => handleDeleteStatement(currentStatement.id)}
                    className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors cursor-pointer"
                    title="Remove statement"
                  >
                    <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                  </button>
                )}
              </div>
            )}

            {summary ? (
              <>
                <AccountSummary summary={summary} />

                {catSuggestion && (
                  <Card className="border-primary/30 bg-primary/5">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-text-primary">Add to Category Map?</p>
                      <p className="text-xs text-text-secondary">
                        From: {catSuggestion.description}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-text-secondary font-medium">Keyword</label>
                          <input
                            value={catSuggestion.keyword}
                            onChange={(e) => setCatSuggestion({ ...catSuggestion, keyword: e.target.value })}
                            className="w-full mt-0.5 px-2 py-1.5 text-xs border border-border rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-secondary font-medium">Category</label>
                          <input
                            value={catSuggestion.category}
                            onChange={(e) => setCatSuggestion({ ...catSuggestion, category: e.target.value })}
                            className="w-full mt-0.5 px-2 py-1.5 text-xs border border-border rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-secondary font-medium">Subcategory</label>
                          <input
                            value={catSuggestion.subcategory}
                            onChange={(e) => setCatSuggestion({ ...catSuggestion, subcategory: e.target.value })}
                            className="w-full mt-0.5 px-2 py-1.5 text-xs border border-border rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAcceptAndApply}>
                          Update &amp; Add Rule
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleAcceptSuggestion}>
                          Add Rule
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setCatSuggestion(null)}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="flex gap-2 border-b border-border">
                  {(['overview', 'transactions', 'insights'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize cursor-pointer
                        ${activeTab === tab
                          ? 'border-primary text-primary'
                          : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <h3 className="font-semibold text-text-primary mb-4">Monthly Credits vs Debits</h3>
                      <SpendingBarChart transactions={summary.transactions} />
                    </Card>
                    <Card>
                      <h3 className="font-semibold text-text-primary mb-4">Spending by Category</h3>
                      <CategoryPieChart categories={liveTopCategories} />
                    </Card>
                    <Card>
                      <MonthlyComparisonChart transactions={summary.transactions} />
                    </Card>
                    <Card>
                      <h3 className="font-semibold text-text-primary mb-4">Balance Trend</h3>
                      <TrendLineChart
                        transactions={summary.transactions}
                        openingBalance={summary.openingBalance}
                      />
                    </Card>
                  </div>
                )}

                {activeTab === 'transactions' && (
                  <Card padding={false}>
                    {selectedTxIndices.size > 0 && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-primary/20">
                        <span className="text-xs font-medium text-text-primary">
                          {selectedTxIndices.size} selected
                        </span>
                        <span className="text-xs text-text-secondary">Set disposition:</span>
                        <button
                          onClick={() => handleBulkDisposition('')}
                          className="px-2 py-1 text-xs border border-border rounded bg-bg-card text-text-primary hover:bg-bg-muted transition-colors cursor-pointer"
                        >
                          Blank
                        </button>
                        <button
                          onClick={() => handleBulkDisposition('Ok')}
                          className="px-2 py-1 text-xs border border-success/40 rounded bg-success/10 text-success hover:bg-success/20 transition-colors cursor-pointer"
                        >
                          Ok
                        </button>
                        <button
                          onClick={() => handleBulkDisposition('To Be Settled')}
                          className="px-2 py-1 text-xs border border-warning/40 rounded bg-warning/10 text-warning hover:bg-warning/20 transition-colors cursor-pointer"
                        >
                          To Be Settled
                        </button>
                      </div>
                    )}
                    {filteredTransactions.length < (summary?.transactions?.length ?? 0) && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-bg-muted border-b border-border">
                        <span className="text-xs text-text-secondary">
                          Showing {filteredTransactions.length} of {summary?.transactions?.length ?? 0} transactions
                        </span>
                        <button
                          onClick={() => setColumnFilters(emptyFilters())}
                          className="text-xs text-primary hover:underline cursor-pointer"
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={filteredTransactions.length > 0 && selectedTxIndices.size === filteredTransactions.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTxIndices(new Set(filteredTransactions.map(({ originalIndex }) => originalIndex)));
                                    } else {
                                      setSelectedTxIndices(new Set());
                                    }
                                  }}
                                  className="rounded border-border cursor-pointer"
                                />
                              </th>
                            <th className="px-3 py-2 font-medium text-text-secondary">
                              <ColumnFilterDropdown label="Date" values={filterUniqueValues.date} selected={columnFilters.date} onChange={(v) => updateFilter('date', v)} />
                            </th>
                            <th className="px-3 py-2 font-medium text-text-secondary">
                              <ColumnFilterDropdown label="Description" values={filterUniqueValues.description} selected={columnFilters.description} onChange={(v) => updateFilter('description', v)} />
                            </th>
                            <th className="px-3 py-2 font-medium text-text-secondary text-right">
                              <ColumnFilterDropdown label="Amount" values={filterUniqueValues.type} selected={columnFilters.type} onChange={(v) => updateFilter('type', v)} align="right" />
                            </th>
                            <th className="px-3 py-2 font-medium text-text-secondary text-right">Balance</th>
                            <th className="px-3 py-2 font-medium text-text-secondary">
                              <ColumnFilterDropdown label="Card Name" values={filterUniqueValues.accountName} selected={columnFilters.accountName} onChange={(v) => updateFilter('accountName', v)} />
                            </th>
                            <th className="px-3 py-2 font-medium text-text-secondary">
                              <ColumnFilterDropdown label="Keyword" values={filterUniqueValues.keyword} selected={columnFilters.keyword} onChange={(v) => updateFilter('keyword', v)} />
                            </th>
                            <th className="px-3 py-2 font-medium text-text-secondary">
                              <ColumnFilterDropdown label="Category" values={filterUniqueValues.category} selected={columnFilters.category} onChange={(v) => updateFilter('category', v)} />
                            </th>
                            <th className="px-3 py-2 font-medium text-text-secondary">
                              <ColumnFilterDropdown label="Subcategory" values={filterUniqueValues.subcategory} selected={columnFilters.subcategory} onChange={(v) => updateFilter('subcategory', v)} />
                            </th>
                            <th className="px-3 py-2 font-medium text-text-secondary">
                              <ColumnFilterDropdown label="Disposition" values={filterUniqueValues.disposition} selected={columnFilters.disposition} onChange={(v) => updateFilter('disposition', v)} />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.map(({ t, originalIndex }) => (
                            <tr key={originalIndex} className={`border-b border-border hover:bg-bg-muted ${selectedTxIndices.has(originalIndex) ? 'bg-primary/5' : ''}`}>
                              <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedTxIndices.has(originalIndex)}
                                    onChange={(e) => {
                                      setSelectedTxIndices((prev) => {
                                        const next = new Set(prev);
                                        if (e.target.checked) {
                                          next.add(originalIndex);
                                        } else {
                                          next.delete(originalIndex);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="rounded border-border cursor-pointer"
                                  />
                                </td>
                              <td className="px-3 py-2 whitespace-nowrap">{t.date}</td>
                              <td className="px-3 py-2 max-w-[250px] break-words">{t.description}</td>
                              <td className={`px-3 py-2 text-right font-medium whitespace-nowrap
                                ${t.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                                {t.type === 'credit' ? '+' : '-'}{formatINR(t.amount)}
                              </td>
                              <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                                {t.balance != null ? formatINR(t.balance) : '—'}
                              </td>
                              <td className="px-3 py-2 text-text-secondary text-xs">
                                {card?.name || '—'}
                              </td>
                              <td className="px-3 py-2 text-text-secondary text-xs">
                                {t.matchedKeyword || '—'}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={t.category}
                                  onChange={(e) => handleUpdateTransaction(originalIndex, 'category', e.target.value)}
                                  className="w-24 px-2 py-1 text-xs border border-border rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={t.subcategory ?? ''}
                                  onChange={(e) => handleUpdateTransaction(originalIndex, 'subcategory', e.target.value)}
                                  maxLength={100}
                                  className="w-24 px-2 py-1 text-xs border border-border rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
                                  placeholder="—"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={t.disposition ?? ''}
                                  onChange={(e) => handleUpdateTransaction(originalIndex, 'disposition', e.target.value)}
                                  className="px-2 py-1 text-xs border border-border rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
                                >
                                  <option value="">—</option>
                                  <option value="Ok">Ok</option>
                                  <option value="To Be Settled">To Be Settled</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {activeTab === 'insights' && (
                  <InsightCard insights={summary.insights} />
                )}
              </>
            ) : statements.length === 0 ? (
              <FileUploader
                accountId={cardId}
                accountName={card?.name}
                inline
                onUploadComplete={handleUploadComplete}
              />
            ) : (
              <Card className="text-center py-12">
                <Spinner className="h-8 w-8 mx-auto text-primary mb-4" />
                <p className="text-text-secondary">Processing statement...</p>
              </Card>
            )}

            <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Statement">
              <FileUploader
                accountId={cardId}
                accountName={card?.name}
                onUploadComplete={handleUploadComplete}
              />
            </Modal>

            <EditCreditCardModal
              open={showEdit}
              onClose={() => setShowEdit(false)}
              card={card}
              onSave={handleEditSave}
            />

          </>
        )}
      </div>
    </AppShell>
  );
}
