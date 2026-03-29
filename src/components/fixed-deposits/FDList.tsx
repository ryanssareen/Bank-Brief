'use client';

import { FDCard } from './FDCard';
import type { FixedDeposit } from '@/types';

interface FDListProps {
  deposits: FixedDeposit[];
  onDelete: (id: string) => void;
}

export function FDList({ deposits, onDelete }: FDListProps) {
  if (deposits.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <p className="text-lg font-medium">No fixed deposits yet</p>
        <p className="text-sm mt-1">Track your FDs to see maturity projections</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {deposits.map((fd) => (
        <FDCard key={fd.id} fd={fd} onDelete={onDelete} />
      ))}
    </div>
  );
}
