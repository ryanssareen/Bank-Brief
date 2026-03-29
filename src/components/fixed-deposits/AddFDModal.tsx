'use client';

import { useState, FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { calculateFDMaturity } from '@/utils/parseTransactions';
import { formatINR } from '@/utils/formatCurrency';
import toast from 'react-hot-toast';
import type { FixedDeposit } from '@/types';

interface AddFDModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: Omit<FixedDeposit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  userId: string;
}

export function AddFDModal({ open, onClose, onAdd, userId }: AddFDModalProps) {
  const [bankName, setBankName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [startDate, setStartDate] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'annually'>('quarterly');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const principalNum = Number(principal) || 0;
  const rateNum = Number(rate) || 0;
  const tenureNum = Number(tenure) || 0;
  const maturityAmount = calculateFDMaturity(principalNum, rateNum, tenureNum, frequency);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const start = new Date(startDate);
    const maturity = new Date(start);
    maturity.setMonth(maturity.getMonth() + tenureNum);

    try {
      await onAdd({
        userId,
        bankName,
        principalAmount: principalNum,
        interestRate: rateNum,
        tenureMonths: tenureNum,
        startDate,
        maturityDate: maturity.toISOString().split('T')[0],
        maturityAmount,
        compoundingFrequency: frequency,
        status: 'active',
        notes: notes || undefined,
      });
      toast.success('Fixed deposit added');
      setBankName('');
      setPrincipal('');
      setRate('');
      setTenure('');
      setStartDate('');
      setNotes('');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add FD');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Fixed Deposit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
        <Input label="Principal Amount (₹)" type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} required />
        <Input label="Interest Rate (% p.a.)" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required />
        <Input label="Tenure (months)" type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} required />
        <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">Compounding Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'monthly' | 'quarterly' | 'annually')}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
          </select>
        </div>

        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {principalNum > 0 && rateNum > 0 && tenureNum > 0 && (
          <div className="p-3 bg-success/10 rounded-lg text-sm">
            <span className="text-text-secondary">Maturity Amount: </span>
            <span className="font-semibold text-success">{formatINR(maturityAmount)}</span>
            <span className="text-text-secondary ml-2">
              (Interest: {formatINR(maturityAmount - principalNum)})
            </span>
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Add Fixed Deposit
        </Button>
      </form>
    </Modal>
  );
}
