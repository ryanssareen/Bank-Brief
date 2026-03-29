'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { FDList } from '@/components/fixed-deposits/FDList';
import { AddFDModal } from '@/components/fixed-deposits/AddFDModal';
import { useAuth } from '@/hooks/useAuth';
import { useFixedDeposits } from '@/hooks/useFixedDeposits';
import { formatINR } from '@/utils/formatCurrency';
import toast from 'react-hot-toast';

export default function FixedDepositsPage() {
  const { user } = useAuth();
  const { deposits, loading, addDeposit, deleteDeposit } = useFixedDeposits(user?.uid);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'matured'>('all');

  const filtered = filter === 'all' ? deposits : deposits.filter((d) => d.status === filter);

  const totalPrincipal = deposits.reduce((s, d) => s + d.principalAmount, 0);
  const totalMaturity = deposits.reduce((s, d) => s + d.maturityAmount, 0);
  const totalInterest = totalMaturity - totalPrincipal;

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fixed deposit?')) return;
    try {
      await deleteDeposit(id);
      toast.success('Fixed deposit deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-primary">Fixed Deposits</h1>
          <Button onClick={() => setShowAdd(true)} size="md">
            <Plus className="h-4 w-4" />
            Add FD
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <p className="text-xs text-text-secondary mb-1">Total Invested</p>
            <p className="text-xl font-semibold text-primary">{formatINR(totalPrincipal)}</p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary mb-1">Total Maturity Value</p>
            <p className="text-xl font-semibold text-success">{formatINR(totalMaturity)}</p>
          </Card>
          <Card>
            <p className="text-xs text-text-secondary mb-1">Total Interest</p>
            <p className="text-xl font-semibold text-warning">{formatINR(totalInterest)}</p>
          </Card>
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'matured'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize cursor-pointer
                ${filter === tab
                  ? 'bg-primary text-white'
                  : 'bg-bg-muted text-text-secondary hover:bg-bg-hover'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : (
          <FDList deposits={filtered} onDelete={handleDelete} />
        )}

        {user?.uid && (
          <AddFDModal
            open={showAdd}
            onClose={() => setShowAdd(false)}
            onAdd={addDeposit}
            userId={user.uid}
          />
        )}
      </div>
    </AppShell>
  );
}
