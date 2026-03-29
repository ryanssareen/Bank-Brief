'use client';

import { Card } from '@/components/ui/Card';
import { formatINR } from '@/utils/formatCurrency';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import type { StatementSummary } from '@/types';

interface AccountSummaryProps {
  summary: StatementSummary;
}

export function AccountSummary({ summary }: AccountSummaryProps) {
  const netChange = summary.closingBalance - summary.openingBalance;

  const stats = [
    { label: 'Total Credits', value: summary.totalCredits, icon: ArrowUpRight, color: 'text-success' },
    { label: 'Total Debits', value: summary.totalDebits, icon: ArrowDownRight, color: 'text-danger' },
    { label: 'Opening Balance', value: summary.openingBalance, icon: TrendingUp, color: 'text-info' },
    { label: 'Closing Balance', value: summary.closingBalance, icon: TrendingDown, color: 'text-primary' },
    { label: 'Net Change', value: netChange, icon: Scale, color: netChange >= 0 ? 'text-success' : 'text-danger' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <p className="text-xs text-text-secondary">{label}</p>
          </div>
          <p className={`text-lg font-semibold ${color}`}>
            {formatINR(value)}
          </p>
        </Card>
      ))}
    </div>
  );
}
