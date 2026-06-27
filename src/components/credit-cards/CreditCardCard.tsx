'use client';

import Link from 'next/link';
import { CreditCard as CreditCardIcon, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CreditCard } from '@/types';

const typeVariant = {
  visa: 'info',
  mastercard: 'warning',
  amex: 'success',
  rupay: 'info',
  other: 'default',
} as const;

export function CreditCardCard({ card }: { card: CreditCard }) {
  return (
    <Link href={`/credit-cards/${card.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCardIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{card.name}</h3>
              <p className="text-sm text-text-secondary">
                {card.bankName}
                {card.cardNumber && ` · ${card.cardNumber}`}
              </p>
            </div>
          </div>
          <Badge variant={typeVariant[card.cardType]}>
            {card.cardType}
          </Badge>
        </div>
        <div className="mt-4 flex items-center justify-end text-sm text-primary-light font-medium group-hover:gap-2 transition-all">
          View details
          <ArrowRight className="h-4 w-4 ml-1" />
        </div>
      </Card>
    </Link>
  );
}
