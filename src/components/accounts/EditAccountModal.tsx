'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Account } from '@/types';

interface EditAccountModalProps {
  open: boolean;
  onClose: () => void;
  account: Account | null;
  onSave: (accountId: string, data: {
    name: string;
    bankName: string;
    accountNumber?: string;
    accountType: 'savings' | 'current' | 'salary';
  }) => Promise<void>;
}

export function EditAccountModal({ open, onClose, account, onSave }: EditAccountModalProps) {
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<'savings' | 'current' | 'salary'>('savings');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setBankName(account.bankName);
      setAccountNumber(account.accountNumber ?? '');
      setAccountType(account.accountType);
    }
  }, [account]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setLoading(true);
    try {
      await onSave(account.id, {
        name,
        bankName,
        accountNumber: accountNumber || '',
        accountType,
      });
      toast.success('Account updated');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Account Nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Bank Name"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          required
        />
        <Input
          label="Account Number"
          placeholder="optional"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">
            Account Type
          </label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as 'savings' | 'current' | 'salary')}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary
              focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent"
          >
            <option value="savings">Savings</option>
            <option value="current">Current</option>
            <option value="salary">Salary</option>
          </select>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Save Changes
        </Button>
      </form>
    </Modal>
  );
}
