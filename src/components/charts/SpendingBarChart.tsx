'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatINR } from '@/utils/formatCurrency';
import type { Transaction } from '@/types';

interface SpendingBarChartProps {
  transactions: Transaction[];
}

export function SpendingBarChart({ transactions }: SpendingBarChartProps) {
  const monthlyData = transactions.reduce<Record<string, { credits: number; debits: number }>>((acc, t) => {
    const month = t.date.slice(0, 7);
    if (!acc[month]) acc[month] = { credits: 0, debits: 0 };
    if (t.type === 'credit') acc[month].credits += t.amount;
    else acc[month].debits += t.amount;
    return acc;
  }, {});

  const data = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, ...vals }));

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v)} />
        <Tooltip formatter={(value) => formatINR(Number(value))} />
        <Legend />
        <Bar dataKey="credits" fill="#2563EB" name="Credits" radius={[4, 4, 0, 0]} />
        <Bar dataKey="debits" fill="#E11D48" name="Debits" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
