'use client';

import { useState, FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface CreateAccountModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    bankName: string;
    accountType: 'savings' | 'current' | 'salary';
    currency: string;
  }) => Promise<void>;
}

export function CreateAccountModal({ open, onClose, onCreate }: CreateAccountModalProps) {
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState<'savings' | 'current' | 'salary'>('savings');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate({ name, bankName, accountType, currency: 'INR' });
      toast.success('Account created');
      setName('');
      setBankName('');
      setAccountType('savings');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Bank Account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Account Nickname"
          placeholder="e.g. HDFC Savings"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Bank Name"
          placeholder="e.g. HDFC Bank"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          required
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
          Create Account
        </Button>
      </form>
    </Modal>
  );
}
