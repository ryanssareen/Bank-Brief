'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import { doc, collection, onSnapshot, addDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { AccountSummary } from '@/components/accounts/AccountSummary';
import { EditAccountModal } from '@/components/accounts/EditAccountModal';
import { CategoryMapModal } from '@/components/accounts/CategoryMapModal';
import { FileUploader } from '@/components/upload/FileUploader';
import { SpendingBarChart } from '@/components/charts/SpendingBarChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { MonthlyComparisonChart } from '@/components/charts/MonthlyComparisonChart';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { useAuth } from '@/hooks/useAuth';
import { formatINR } from '@/utils/formatCurrency';
import { Upload, Mail, Pencil, ListFilter, Layers, Download } from 'lucide-react';
import { exportTransactionsCSV, exportSummaryCSV } from '@/utils/exportData';
import toast from 'react-hot-toast';
import type { Account, Statement, StatementSummary, Transaction, CategoryRule } from '@/types';

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = use(params);
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCategoryMap, setShowCategoryMap] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'insights'>('overview');
  const [sendingEmail, setSendingEmail] = useState(false);

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

  const handleCategoryMapSave = useCallback(
    async (rules: CategoryRule[]) => {
      if (!user?.uid) return;
      await updateDoc(doc(db, 'users', user.uid, 'accounts', accountId), {
        categoryMap: rules,
        updatedAt: serverTimestamp(),
      });
    },
    [user?.uid, accountId]
  );

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
                <Button variant="secondary" size="md" onClick={() => setShowCategoryMap(true)}>
                  <ListFilter className="h-4 w-4" />
                  Category Map
                </Button>
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
                            <th className="px-4 py-3 font-medium text-text-secondary">Category</th>
                            <th className="px-4 py-3 font-medium text-text-secondary">Subcategory</th>
                            <th className="px-4 py-3 font-medium text-text-secondary">Disposition</th>
                            <th className="px-4 py-3 font-medium text-text-secondary text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.transactions.map((t, i) => (
                            <tr key={i} className="border-b border-border hover:bg-bg-muted">
                              <td className="px-4 py-3 whitespace-nowrap">{t.date}</td>
                              <td className="px-4 py-3">{t.description}</td>
                              <td className="px-4 py-3">
                                <Badge>{t.category}</Badge>
                              </td>
                              <td className="px-4 py-3 text-text-secondary">
                                {t.subcategory || '—'}
                              </td>
                              <td className="px-4 py-3">
                                {t.disposition ? (
                                  <Badge variant={
                                    t.disposition === 'essential' ? 'warning' :
                                    t.disposition === 'income' ? 'success' :
                                    t.disposition === 'transfer' ? 'info' : 'default'
                                  }>
                                    {t.disposition}
                                  </Badge>
                                ) : '—'}
                              </td>
                              <td className={`px-4 py-3 text-right font-medium whitespace-nowrap
                                ${t.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                                {t.type === 'credit' ? '+' : '-'}{formatINR(t.amount)}
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

            <CategoryMapModal
              open={showCategoryMap}
              onClose={() => setShowCategoryMap(false)}
              rules={account?.categoryMap ?? []}
              onSave={handleCategoryMapSave}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
