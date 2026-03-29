'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatINR } from '@/utils/formatCurrency';

interface CategoryPieChartProps {
  categories: { name: string; amount: number }[];
}

const COLORS = ['#2563EB', '#0D9488', '#D97706', '#E11D48', '#7C3AED', '#059669', '#94A3B8'];

export function CategoryPieChart({ categories }: CategoryPieChartProps) {
  const top6 = categories.slice(0, 6);
  const otherAmount = categories.slice(6).reduce((sum, c) => sum + c.amount, 0);
  const data = otherAmount > 0 ? [...top6, { name: 'Other', amount: otherAmount }] : top6;

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name }) => name}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatINR(Number(value))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
