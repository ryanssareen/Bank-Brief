'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { Trash2 } from 'lucide-react';
import type { FixedDeposit } from '@/types';

interface FDCardProps {
  fd: FixedDeposit;
  onDelete: (id: string) => void;
}

const statusVariant = {
  active: 'success',
  matured: 'info',
  broken: 'danger',
} as const;

export function FDCard({ fd, onDelete }: FDCardProps) {
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(fd.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-text-primary">{fd.bankName}</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {formatDate(fd.startDate)} → {formatDate(fd.maturityDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[fd.status]}>{fd.status}</Badge>
          <button
            onClick={() => onDelete(fd.id)}
            className="p-1 hover:bg-danger/10 rounded text-text-secondary hover:text-danger transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-text-secondary text-xs">Principal</p>
          <p className="font-semibold">{formatINR(fd.principalAmount)}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">Maturity Amount</p>
          <p className="font-semibold text-success">{formatINR(fd.maturityAmount)}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">Interest Rate</p>
          <p className="font-medium">{fd.interestRate}% p.a.</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">Tenure</p>
          <p className="font-medium">{fd.tenureMonths} months</p>
        </div>
      </div>

      {fd.status === 'active' && (
        <div className="mt-3 pt-3 border-t border-border text-xs text-text-secondary">
          {daysRemaining} days remaining
        </div>
      )}
    </Card>
  );
}
