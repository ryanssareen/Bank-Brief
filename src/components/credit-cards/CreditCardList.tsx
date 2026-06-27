'use client';

import { CreditCardCard } from './CreditCardCard';
import type { CreditCard } from '@/types';

export function CreditCardList({ creditCards }: { creditCards: CreditCard[] }) {
  if (creditCards.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <p className="text-lg font-medium">No credit cards yet</p>
        <p className="text-sm mt-1">Add your first credit card to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {creditCards.map((card) => (
        <CreditCardCard key={card.id} card={card} />
      ))}
    </div>
  );
}
