'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Account } from '@/types';

export function useAccounts(uid: string | undefined) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', uid, 'accounts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() ?? new Date(),
        updatedAt: d.data().updatedAt?.toDate() ?? new Date(),
      })) as Account[];
      setAccounts(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [uid]);

  const createAccount = useCallback(
    async (data: Pick<Account, 'name' | 'bankName' | 'accountType' | 'currency'>) => {
      if (!uid) return;
      await addDoc(collection(db, 'users', uid, 'accounts'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [uid]
  );

  const updateAccount = useCallback(
    async (accountId: string, data: Partial<Pick<Account, 'name' | 'bankName' | 'accountNumber' | 'accountType'>>) => {
      if (!uid) return;
      await updateDoc(doc(db, 'users', uid, 'accounts', accountId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    [uid]
  );

  const deleteAccount = useCallback(
    async (accountId: string) => {
      if (!uid) return;
      await deleteDoc(doc(db, 'users', uid, 'accounts', accountId));
    },
    [uid]
  );

  return { accounts, loading, createAccount, updateAccount, deleteAccount };
}
