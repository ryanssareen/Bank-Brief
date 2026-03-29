'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CreditCard,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CreateAccountModal } from '@/components/accounts/CreateAccountModal';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useFixedDeposits } from '@/hooks/useFixedDeposits';
import { formatINR } from '@/utils/formatCurrency';
import type { Account } from '@/types';

const bankColors: Record<string, string> = {
  'HDFC': 'from-blue-600 to-blue-400',
  'SBI': 'from-indigo-600 to-indigo-400',
  'ICICI': 'from-orange-500 to-amber-400',
  'Axis': 'from-rose-600 to-pink-400',
  'Kotak': 'from-red-600 to-red-400',
};

function getBankGradient(bankName: string) {
  const key = Object.keys(bankColors).find((k) => bankName.toLowerCase().includes(k.toLowerCase()));
  return key ? bankColors[key] : 'from-primary to-primary-light';
}

function BankCard({ account }: { account: Account }) {
  const gradient = getBankGradient(account.bankName);
  return (
    <Link href={`/accounts/${account.id}`} className="block group">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white min-h-[160px] flex flex-col justify-between hover:shadow-xl hover:shadow-black/10 transition-all duration-300 hover:-translate-y-0.5`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{account.bankName}</p>
            <CreditCard className="h-5 w-5 text-white/40" />
          </div>
          <p className="text-lg font-bold mt-1">{account.name}</p>
        </div>
        <div className="relative flex items-end justify-between">
          <Badge variant="default" className="bg-white/20 text-white border-0 text-[11px]">
            {account.accountType}
          </Badge>
          <ChevronRight className="h-4 w-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { accounts, loading, createAccount } = useAccounts(user?.uid);
  const { deposits } = useFixedDeposits(user?.uid);
  const [showCreate, setShowCreate] = useState(false);

  const totalFDPrincipal = deposits.reduce((s, d) => s + d.principalAmount, 0);
  const totalFDMaturity = deposits.reduce((s, d) => s + d.maturityAmount, 0);
  const totalFDInterest = totalFDMaturity - totalFDPrincipal;
  const activeFDs = deposits.filter((d) => d.status === 'active');
  const nextMaturity = activeFDs.length > 0 ? activeFDs[0] : null;
  const nextMaturityDays = nextMaturity
    ? Math.max(0, Math.ceil((new Date(nextMaturity.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Top row — stats + quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main balance card */}
          <Card className="lg:col-span-2 !p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-primary via-[#1e4a7a] to-primary-light p-8 text-white">
              <p className="text-white/60 text-sm font-medium">Portfolio Overview</p>
              <p className="text-4xl font-bold mt-2 tracking-tight">{formatINR(0)}</p>
              <p className="text-white/50 text-sm mt-1">Total across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-white/60 text-xs mb-1">
                    <ArrowUpRight className="h-3 w-3" />
                    Income
                  </div>
                  <p className="font-semibold">{formatINR(0)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-white/60 text-xs mb-1">
                    <ArrowDownRight className="h-3 w-3" />
                    Expenses
                  </div>
                  <p className="font-semibold">{formatINR(0)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-white/60 text-xs mb-1">
                    <TrendingUp className="h-3 w-3" />
                    Savings
                  </div>
                  <p className="font-semibold">{formatINR(0)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick actions */}
          <Card className="flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-4">Quick Actions</p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-page transition-colors text-left cursor-pointer"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Add Account</p>
                    <p className="text-xs text-text-secondary">Connect a bank</p>
                  </div>
                </button>
                <Link
                  href="/fixed-deposits"
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-page transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    <PiggyBank className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Fixed Deposits</p>
                    <p className="text-xs text-text-secondary">Track your FDs</p>
                  </div>
                </Link>
                <Link
                  href="/settings"
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-page transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-info" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Preferences</p>
                    <p className="text-xs text-text-secondary">Theme & profile</p>
                  </div>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Accounts */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-text-primary">Your Accounts</h2>
              {accounts.length > 0 && (
                <span className="text-xs font-medium text-text-secondary bg-bg-page px-2.5 py-1 rounded-full">
                  {accounts.length}
                </span>
              )}
            </div>
            {accounts.length > 0 && (
              <Link href="/accounts" className="text-sm font-medium text-primary-light hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border py-16 px-6 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-primary-light/[0.02]" />
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <p className="text-xl font-semibold text-text-primary">Add your first account</p>
                <p className="text-text-secondary mt-2 max-w-sm mx-auto">
                  Connect a bank account and upload statements to see AI-powered insights
                </p>
                <Button onClick={() => setShowCreate(true)} size="lg" className="mt-6">
                  <Plus className="h-4 w-4" />
                  Add Account
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <BankCard key={account.id} account={account} />
              ))}
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-2xl border-2 border-dashed border-border hover:border-primary/30 min-h-[160px] flex flex-col items-center justify-center gap-2 text-text-secondary hover:text-primary transition-all cursor-pointer group"
              >
                <div className="h-10 w-10 rounded-xl bg-bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">Add Account</span>
              </button>
            </div>
          )}
        </div>

        {/* FD Section */}
        {deposits.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-text-primary">Fixed Deposits</h2>
              <Link href="/fixed-deposits" className="text-sm font-medium text-primary-light hover:underline flex items-center gap-1">
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-text-secondary">Invested</p>
                </div>
                <p className="text-xl font-bold text-text-primary">{formatINR(totalFDPrincipal)}</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-xs text-text-secondary">Maturity Value</p>
                </div>
                <p className="text-xl font-bold text-success">{formatINR(totalFDMaturity)}</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                    <TrendingDown className="h-4 w-4 text-warning" />
                  </div>
                  <p className="text-xs text-text-secondary">Interest Earned</p>
                </div>
                <p className="text-xl font-bold text-warning">{formatINR(totalFDInterest)}</p>
              </Card>
              {nextMaturity ? (
                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-info" />
                    </div>
                    <p className="text-xs text-text-secondary">Next Maturity</p>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">{nextMaturity.bankName}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {formatINR(nextMaturity.maturityAmount)} · {nextMaturityDays}d left
                  </p>
                </Card>
              ) : (
                <Card className="flex items-center justify-center">
                  <p className="text-sm text-text-secondary">No active FDs</p>
                </Card>
              )}
            </div>
          </div>
        )}

        <CreateAccountModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreate={createAccount}
        />
      </div>
    </AppShell>
  );
}
