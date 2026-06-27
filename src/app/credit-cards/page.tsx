'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CreditCardList } from '@/components/credit-cards/CreditCardList';
import { CreateCreditCardModal } from '@/components/credit-cards/CreateCreditCardModal';
import { useAuth } from '@/hooks/useAuth';
import { useCreditCards } from '@/hooks/useCreditCards';

export default function CreditCardsPage() {
  const { user } = useAuth();
  const { creditCards, loading, createCreditCard } = useCreditCards(user?.uid);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Credit Cards</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage your credit cards and upload statements
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="md">
            <Plus className="h-4 w-4" />
            Add Credit Card
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : (
          <CreditCardList creditCards={creditCards} />
        )}

        <CreateCreditCardModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreate={createCreditCard}
        />
      </div>
    </AppShell>
  );
}
