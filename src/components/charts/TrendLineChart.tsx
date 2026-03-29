'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatINR } from '@/utils/formatCurrency';
import type { Transaction } from '@/types';

interface TrendLineChartProps {
  transactions: Transaction[];
  openingBalance: number;
}

export function TrendLineChart({ transactions, openingBalance }: TrendLineChartProps) {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  let balance = openingBalance;
  const data = sorted.map((t) => {
    balance += t.type === 'credit' ? t.amount : -t.amount;
    return { date: t.date, balance };
  });

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v)} />
        <Tooltip formatter={(value) => formatINR(Number(value))} />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#1B3A5C"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
