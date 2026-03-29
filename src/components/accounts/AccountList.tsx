'use client';

import { AccountCard } from './AccountCard';
import type { Account } from '@/types';

export function AccountList({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <p className="text-lg font-medium">No accounts yet</p>
        <p className="text-sm mt-1">Add your first bank account to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
