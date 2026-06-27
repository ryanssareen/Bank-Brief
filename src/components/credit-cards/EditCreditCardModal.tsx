'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { CreditCard } from '@/types';

type CardType = CreditCard['cardType'];

interface EditCreditCardModalProps {
  open: boolean;
  onClose: () => void;
  card: CreditCard | null;
  onSave: (cardId: string, data: {
    name: string;
    bankName: string;
    cardNumber?: string;
    cardType: CardType;
  }) => Promise<void>;
}

export function EditCreditCardModal({ open, onClose, card, onSave }: EditCreditCardModalProps) {
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardType, setCardType] = useState<CardType>('visa');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (card) {
      setName(card.name);
      setBankName(card.bankName);
      setCardNumber(card.cardNumber ?? '');
      setCardType(card.cardType);
    }
  }, [card]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!card) return;
    setLoading(true);
    try {
      await onSave(card.id, {
        name,
        bankName,
        cardNumber: cardNumber || '',
        cardType,
      });
      toast.success('Credit card updated');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Credit Card">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Card Nickname"
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
          label="Card Number"
          placeholder="optional"
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
          Save Changes
        </Button>
      </form>
    </Modal>
  );
}
