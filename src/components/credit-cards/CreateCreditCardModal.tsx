'use client';

import { useState, FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { CreditCard } from '@/types';

type CardType = CreditCard['cardType'];

interface CreateCreditCardModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    bankName: string;
    cardNumber?: string;
    cardType: CardType;
    currency: string;
  }) => Promise<void>;
}

export function CreateCreditCardModal({ open, onClose, onCreate }: CreateCreditCardModalProps) {
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardType, setCardType] = useState<CardType>('visa');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate({ name, bankName, cardNumber: cardNumber || '', cardType, currency: 'INR' });
      toast.success('Credit card added');
      setName('');
      setBankName('');
      setCardNumber('');
      setCardType('visa');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add credit card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Credit Card">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Card Nickname"
          placeholder="e.g. HDFC Regalia"
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
        <Input
          label="Card Number"
          placeholder="e.g. **** 1234 (optional)"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-primary">
            Card Network
          </label>
          <select
            value={cardType}
            onChange={(e) => setCardType(e.target.value as CardType)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary
              focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent"
          >
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="amex">Amex</option>
            <option value="rupay">RuPay</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Add Credit Card
        </Button>
      </form>
    </Modal>
  );
}
