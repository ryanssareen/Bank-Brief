'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AccountList } from '@/components/accounts/AccountList';
import { CreateAccountModal } from '@/components/accounts/CreateAccountModal';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';

export default function AccountsPage() {
  const { user } = useAuth();
  const { accounts, loading, createAccount } = useAccounts(user?.uid);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Accounts</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage your bank accounts and upload statements
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="md">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : (
          <AccountList accounts={accounts} />
        )}

        <CreateAccountModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreate={createAccount}
        />
      </div>
    </AppShell>
  );
}
