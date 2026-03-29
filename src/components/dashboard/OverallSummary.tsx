'use client';

import { Card } from '@/components/ui/Card';
import { formatINR } from '@/utils/formatCurrency';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

interface OverallSummaryProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netSavings: number;
}

export function OverallSummary({ totalBalance, monthlyIncome, monthlyExpenses, netSavings }: OverallSummaryProps) {
  const stats = [
    { label: 'Total Balance', value: totalBalance, icon: Wallet, color: 'text-primary' },
    { label: 'Monthly Income', value: monthlyIncome, icon: TrendingUp, color: 'text-success' },
    { label: 'Monthly Expenses', value: monthlyExpenses, icon: TrendingDown, color: 'text-danger' },
    { label: 'Net Savings', value: netSavings, icon: PiggyBank, color: 'text-warning' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <p className="text-xs text-text-secondary">{label}</p>
          </div>
          <p className={`text-xl font-semibold ${color}`}>{formatINR(value)}</p>
        </Card>
      ))}
    </div>
  );
}
