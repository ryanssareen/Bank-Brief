'use client';

import Link from 'next/link';
import { Wallet, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Account } from '@/types';

const typeVariant = {
  savings: 'success',
  current: 'info',
  salary: 'warning',
} as const;

export function AccountCard({ account }: { account: Account }) {
  return (
    <Link href={`/accounts/${account.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{account.name}</h3>
              <p className="text-sm text-text-secondary">
                {account.bankName}
                {account.accountNumber && ` · ${account.accountNumber}`}
              </p>
            </div>
          </div>
          <Badge variant={typeVariant[account.accountType]}>
            {account.accountType}
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
