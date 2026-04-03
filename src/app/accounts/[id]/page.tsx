'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import { doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { AccountSummary } from '@/components/accounts/AccountSummary';
import { EditAccountModal } from '@/components/accounts/EditAccountModal';

import { FileUploader } from '@/components/upload/FileUploader';
import { SpendingBarChart } from '@/components/charts/SpendingBarChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { MonthlyComparisonChart } from '@/components/charts/MonthlyComparisonChart';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { useAuth } from '@/hooks/useAuth';
import { formatINR } from '@/utils/formatCurrency';
import { Upload, Mail, Pencil, ListFilter, Layers, Download, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { exportTransactionsCSV, exportSummaryCSV } from '@/utils/exportData';
import toast from 'react-hot-toast';
import type { Account, Statement, StatementSummary, Transaction } from '@/types';

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = use(params);
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'insights'>('overview');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [catSuggestion, setCatSuggestion] = useState<{
    keyword: string;
    category: string;
    subcategory: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const accountUnsub = onSnapshot(
      doc(db, 'users', user.uid, 'accounts', accountId),
      (snap) => {
        if (snap.exists()) {
          setAccount({ id: snap.id, ...snap.data() } as Account);
        }
      }
    );

    const statementsUnsub = onSnapshot(
      query(
        collection(db, 'users', user.uid, 'accounts', accountId, 'statements'),
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
      accountUnsub();
      statementsUnsub();
    };
  }, [user?.uid, accountId]);

  const handleUploadComplete = useCallback(
    async (result: { fileName: string; fileType: string; extractedText: string; summary: Record<string, unknown> }) => {
      if (!user?.uid) return;

      const existingTxKeys = new Set<string>();
      for (const s of statements) {
        const sum = s.summary as StatementSummary | undefined;
        if (!sum?.transactions) continue;
        for (const t of sum.transactions) {
          existingTxKeys.add(`${t.date}|${t.description}|${t.amount}`);
        }
      }

      const rawSummary = result.summary as { transactions?: { date: string; description: string; amount: number; type: string; category: string }[] } & Record<string, unknown>;
      const allTx = rawSummary.transactions ?? [];
      const uniqueTx = allTx.filter(
        (t) => !existingTxKeys.has(`${t.date}|${t.description}|${t.amount}`)
      );

      const totalCredits = uniqueTx.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
      const totalDebits = uniqueTx.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

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
        topCategories,
      };

      await addDoc(
        collection(db, 'users', user.uid, 'accounts', accountId, 'statements'),
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
    [user?.uid, accountId, statements]
  );

  const overallSummary = useMemo<StatementSummary | undefined>(() => {
    if (statements.length === 0) return undefined;
    const txMap = new Map<string, Transaction>();
    for (const s of statements) {
      const sum = s.summary as StatementSummary | undefined;
      if (!sum?.transactions) continue;
      for (const t of sum.transactions) {
        const key = `${t.date}|${t.description}|${t.amount}`;
        if (!txMap.has(key)) txMap.set(key, t);
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
    const first = statements[statements.length - 1]?.summary as StatementSummary | undefined;
    const last = statements[0]?.summary as StatementSummary | undefined;
    return {
      totalCredits,
      totalDebits,
      openingBalance: first?.openingBalance ?? 0,
      closingBalance: last?.closingBalance ?? 0,
      topCategories,
      insights: last?.insights ?? [],
      transactions: allTx,
      generatedAt: new Date(),
    };
  }, [statements]);

  const currentStatement = statements[selectedIdx];
  const isOverall = selectedIdx === -1;
  const summary = isOverall ? overallSummary : (currentStatement?.summary as StatementSummary | undefined);

  const handleEditSave = useCallback(
    async (_id: string, data: { name: string; bankName: string; accountNumber?: string; accountType: 'savings' | 'current' | 'salary' }) => {
      if (!user?.uid) return;
      await updateDoc(doc(db, 'users', user.uid, 'accounts', accountId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    [user?.uid, accountId]
  );

  const handleDeleteStatement = useCallback(
    async (statementId: string) => {
      if (!user?.uid) return;
      if (!confirm('Remove this statement? This cannot be undone.')) return;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'accounts', accountId, 'statements', statementId));
        setSelectedIdx((prev) => {
          if (statements.length <= 2) return 0;
          return prev > 0 ? prev - 1 : -1;
        });
        toast.success('Statement removed');
      } catch {
        toast.error('Failed to remove statement');
      }
    },
    [user?.uid, accountId, statements.length]
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
      if (!user?.uid || isOverall || !currentStatement) return;
      const sum = currentStatement.summary as StatementSummary | undefined;
      if (!sum?.transactions) return;

      const updatedTx = sum.transactions.map((t, i) =>
        i === txIdx ? { ...t, [field]: value } : t
      );

      try {
        await updateDoc(
          doc(db, 'users', user.uid, 'accounts', accountId, 'statements', currentStatement.id),
          { 'summary.transactions': updatedTx }
        );

        if ((field === 'category' || field === 'subcategory') && value) {
          const tx = updatedTx[txIdx];
          const cat = tx.category;
          const sub = tx.subcategory ?? '';
          if (!cat) return;

          const keyword = extractKeyword(tx.description);
          if (!keyword) return;

          const existingRules = account?.categoryMap ?? [];
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
    [user?.uid, accountId, isOverall, currentStatement, account?.categoryMap, extractKeyword]
  );

  const handleAcceptSuggestion = useCallback(async () => {
    if (!user?.uid || !catSuggestion) return;
    const existingRules = account?.categoryMap ?? [];
    const newRules = [...existingRules, {
      keyword: catSuggestion.keyword,
      category: catSuggestion.category,
      subcategory: catSuggestion.subcategory,
    }];
    try {
      await updateDoc(doc(db, 'users', user.uid, 'accounts', accountId), {
        categoryMap: newRules,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Added "${catSuggestion.keyword}" → "${catSuggestion.category}" to category map`);
    } catch {
      toast.error('Failed to add rule');
    }
    setCatSuggestion(null);
  }, [user?.uid, accountId, account?.categoryMap, catSuggestion]);

  const [applyingCategoryMap, setApplyingCategoryMap] = useState(false);

  const handleApplyCategoryMap = useCallback(
    async () => {
      if (!user?.uid || !account?.categoryMap?.length) {
        toast.error('No category map defined. Add rules first.');
        return;
      }

      setApplyingCategoryMap(true);
      try {
        let updated = 0;
        for (const stmt of statements) {
          const sum = stmt.summary as StatementSummary | undefined;
          if (!sum?.transactions?.length) continue;

          let changed = false;
          const updatedTx = sum.transactions.map((t) => {
            if (t.disposition) return t;

            let matchedCategory = '';
            let matchedSubcategory = '';
            const descLower = t.description.toLowerCase();

            for (const rule of account.categoryMap!) {
              if (descLower.includes(rule.keyword.toLowerCase())) {
                matchedCategory = rule.category;
                matchedSubcategory = rule.subcategory ?? '';
                break;
              }
            }

            if (matchedCategory !== t.category || matchedSubcategory !== (t.subcategory ?? '')) {
              changed = true;
            }

            return { ...t, category: matchedCategory, subcategory: matchedSubcategory };
          });

          if (changed) {
            await updateDoc(
              doc(db, 'users', user.uid, 'accounts', accountId, 'statements', stmt.id),
              { 'summary.transactions': updatedTx }
            );
            updated++;
          }
        }
        toast.success(`Updated ${updated} statement(s) based on category map`);
      } catch {
        toast.error('Failed to apply category map');
      } finally {
        setApplyingCategoryMap(false);
      }
    },
    [user?.uid, accountId, account?.categoryMap, statements]
  );

  const deduplicateStatements = useCallback(
    async () => {
      if (!user?.uid || statements.length < 2) return;

      const statementsWithKeys = statements
        .filter((s) => s.summary && (s.summary as StatementSummary).transactions?.length)
        .map((s) => {
          const txKeys = new Set(
            ((s.summary as StatementSummary).transactions ?? []).map(
              (t) => `${t.date}|${t.description}|${t.amount}`
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
            mergedTxMap.set(`${t.date}|${t.description}|${t.amount}`, t);
          }
          for (const t of (smaller.statement.summary as StatementSummary).transactions) {
            const key = `${t.date}|${t.description}|${t.amount}`;
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

          const keepRef = doc(db, 'users', user.uid, 'accounts', accountId, 'statements', larger.statement.id);
          const removeRef = doc(db, 'users', user.uid, 'accounts', accountId, 'statements', smaller.statement.id);

          const existingSummary = larger.statement.summary as StatementSummary;
          await updateDoc(keepRef, {
            summary: {
              ...existingSummary,
              transactions: mergedTx,
              totalCredits,
              totalDebits,
              topCategories,
            },
          });
          await deleteDoc(removeRef);
          return;
        }
      }
    },
    [user?.uid, accountId, statements]
  );

  useEffect(() => {
    if (statements.length < 2) return;
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
          accountName: account?.name ?? 'Account',
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
                    {account?.name ?? 'Account'}
                  </h1>
                  {account?.accountType && (
                    <Badge variant="info">{account.accountType}</Badge>
                  )}
                  <button
                    onClick={() => setShowEdit(true)}
                    className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors cursor-pointer"
                    title="Edit account"
                  >
                    <Pencil className="h-4 w-4 text-text-secondary" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {account?.bankName && (
                    <p className="text-sm text-text-secondary">{account.bankName}</p>
                  )}
                  {account?.accountNumber && (
                    <p className="text-sm text-text-secondary">
                      &middot; A/C: {account.accountNumber}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link href={`/accounts/${accountId}/category-map`}>
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
                      onClick={() => exportSummaryCSV(summary, account?.name ?? 'account')}
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
                  onChange={(e) => setSelectedIdx(Number(e.target.value))}
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
                      <CategoryPieChart categories={summary.topCategories} />
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="px-4 py-3 font-medium text-text-secondary">Date</th>
                            <th className="px-4 py-3 font-medium text-text-secondary">Description</th>
                            <th className="px-4 py-3 font-medium text-text-secondary text-right">Amount</th>
                            <th className="px-4 py-3 font-medium text-text-secondary">Account Name</th>
                            <th className="px-4 py-3 font-medium text-text-secondary">Category</th>
                            <th className="px-4 py-3 font-medium text-text-secondary">Subcategory</th>
                            <th className="px-4 py-3 font-medium text-text-secondary">Disposition</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.transactions.map((t, i) => (
                            <tr key={i} className="border-b border-border hover:bg-bg-muted">
                              <td className="px-4 py-3 whitespace-nowrap">{t.date}</td>
                              <td className="px-4 py-3">{t.description}</td>
                              <td className={`px-4 py-3 text-right font-medium whitespace-nowrap
                                ${t.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                                {t.type === 'credit' ? '+' : '-'}{formatINR(t.amount)}
                              </td>
                              <td className="px-4 py-3 text-text-secondary text-xs">
                                {account?.name || '—'}
                              </td>
                              <td className="px-4 py-3">
                                {!isOverall ? (
                                  <input
                                    type="text"
                                    value={t.category}
                                    onChange={(e) => handleUpdateTransaction(i, 'category', e.target.value)}
                                    className="w-24 px-2 py-1 text-xs border border-border rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
                                  />
                                ) : (
                                  <Badge>{t.category}</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {!isOverall ? (
                                  <input
                                    type="text"
                                    value={t.subcategory ?? ''}
                                    onChange={(e) => handleUpdateTransaction(i, 'subcategory', e.target.value)}
                                    className="w-24 px-2 py-1 text-xs border border-border rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
                                    placeholder="—"
                                  />
                                ) : (
                                  <span className="text-text-secondary">{t.subcategory || '—'}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {!isOverall ? (
                                  <select
                                    value={t.disposition ?? ''}
                                    onChange={(e) => handleUpdateTransaction(i, 'disposition', e.target.value)}
                                    className="px-2 py-1 text-xs border border-border rounded bg-bg-card text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-light"
                                  >
                                    <option value="">—</option>
                                    <option value="Ok">Ok</option>
                                    <option value="To Be Settled">To Be Settled</option>
                                  </select>
                                ) : (
                                  t.disposition ? (
                                    <Badge variant={t.disposition === 'Ok' ? 'success' : 'warning'}>
                                      {t.disposition}
                                    </Badge>
                                  ) : '—'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {catSuggestion && (
                  <Card className="border-primary/30 bg-primary/5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary">
                          Add to Category Map?
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          Keyword <span className="font-semibold text-text-primary">&quot;{catSuggestion.keyword}&quot;</span> →
                          Category <span className="font-semibold text-text-primary">&quot;{catSuggestion.category}&quot;</span>
                          {catSuggestion.subcategory && (
                            <>, Subcategory <span className="font-semibold text-text-primary">&quot;{catSuggestion.subcategory}&quot;</span></>
                          )}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          From: {catSuggestion.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAcceptSuggestion}>
                          Add Rule
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setCatSuggestion(null)}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {activeTab === 'insights' && (
                  <InsightCard insights={summary.insights} />
                )}
              </>
            ) : statements.length === 0 ? (
              <Card className="text-center py-12">
                <Upload className="h-12 w-12 mx-auto text-text-secondary mb-4" />
                <p className="text-lg font-medium text-text-primary">No statements yet</p>
                <p className="text-sm text-text-secondary mt-1">Upload a bank statement to get started</p>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <Spinner className="h-8 w-8 mx-auto text-primary mb-4" />
                <p className="text-text-secondary">Processing statement...</p>
              </Card>
            )}

            <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Statement">
              <FileUploader
                accountId={accountId}
                accountName={account?.name}
                categoryRules={account?.categoryMap}
                onUploadComplete={handleUploadComplete}
              />
            </Modal>

            <EditAccountModal
              open={showEdit}
              onClose={() => setShowEdit(false)}
              account={account}
              onSave={handleEditSave}
            />

          </>
        )}
      </div>
    </AppShell>
  );
}
