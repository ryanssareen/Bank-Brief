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

  const total = data.reduce((s, d) => s + d.amount, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (props: any) => {
    const { name, percent, x, y, textAnchor } = props;
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} textAnchor={textAnchor} fill="#374151" fontSize={12}>
        {name} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={40}
          label={renderLabel}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatINR(Number(value))}
          labelFormatter={(name) => {
            const item = data.find((d) => d.name === name);
            const pct = item ? ((item.amount / total) * 100).toFixed(1) : '0';
            return `${name} (${pct}%)`;
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
