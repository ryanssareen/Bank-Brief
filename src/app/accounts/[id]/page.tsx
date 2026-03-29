'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { doc, collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { AccountSummary } from '@/components/accounts/AccountSummary';
import { FileUploader } from '@/components/upload/FileUploader';
import { SpendingBarChart } from '@/components/charts/SpendingBarChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { useAuth } from '@/hooks/useAuth';
import { formatINR } from '@/utils/formatCurrency';
import { Upload, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Account, Statement, StatementSummary } from '@/types';

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = use(params);
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
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
          summary: { ...result.summary, generatedAt: serverTimestamp() },
        }
      );
      setShowUpload(false);
    },
    [user?.uid, accountId]
  );

  const currentStatement = statements[selectedIdx];
  const summary = currentStatement?.summary as StatementSummary | undefined;

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
                </div>
                {account?.bankName && (
                  <p className="text-sm text-text-secondary mt-1">{account.bankName}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowUpload(true)} size="md">
                  <Upload className="h-4 w-4" />
                  Upload Statement
                </Button>
                {summary && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleSendEmail}
                    loading={sendingEmail}
                  >
                    <Mail className="h-4 w-4" />
                    Send Report
                  </Button>
                )}
              </div>
            </div>

            {statements.length > 1 && (
              <select
                value={selectedIdx}
                onChange={(e) => setSelectedIdx(Number(e.target.value))}
                className="border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
              >
                {statements.map((s, i) => (
                  <option key={s.id} value={i}>{s.fileName}</option>
                ))}
              </select>
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
                    <Card className="lg:col-span-2">
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
                onUploadComplete={handleUploadComplete}
              />
            </Modal>
          </>
        )}
      </div>
    </AppShell>
  );
}
