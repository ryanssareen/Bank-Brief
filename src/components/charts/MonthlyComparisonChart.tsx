'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatINR } from '@/utils/formatCurrency';
import type { Transaction } from '@/types';

interface MonthlyComparisonChartProps {
  transactions: Transaction[];
}

export function MonthlyComparisonChart({ transactions }: MonthlyComparisonChartProps) {
  const monthlySpending = transactions.reduce<Record<string, number>>((acc, t) => {
    if (t.type !== 'debit') return acc;
    const month = t.date.slice(0, 7);
    acc[month] = (acc[month] ?? 0) + t.amount;
    return acc;
  }, {});

  const sorted = Object.entries(monthlySpending)
    .sort(([a], [b]) => a.localeCompare(b));

  if (sorted.length < 2) return null;

  const last2 = sorted.slice(-2);
  const [prevMonth, prevAmt] = last2[0];
  const [currMonth, currAmt] = last2[1];
  const diff = currAmt - prevAmt;
  const pctChange = prevAmt > 0 ? ((diff / prevAmt) * 100).toFixed(1) : '0';

  const data = [
    { month: formatMonth(prevMonth), spending: prevAmt, isCurrent: false },
    { month: formatMonth(currMonth), spending: currAmt, isCurrent: true },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Monthly Comparison</h3>
        <span className={`text-sm font-medium ${diff > 0 ? 'text-danger' : 'text-success'}`}>
          {diff > 0 ? '↑' : '↓'} {Math.abs(Number(pctChange))}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={48}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatINR(v)} width={80} />
          <Tooltip formatter={(value) => formatINR(Number(value))} />
          <Bar dataKey="spending" radius={[6, 6, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.isCurrent ? '#2563EB' : '#94A3B8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatMonth(ym: string) {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}
