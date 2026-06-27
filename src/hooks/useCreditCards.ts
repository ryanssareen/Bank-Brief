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
import toast from 'react-hot-toast';
import type { CreditCard } from '@/types';

export function useCreditCards(uid: string | undefined) {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setCreditCards([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', uid, 'creditCards'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate() ?? new Date(),
        })) as CreditCard[];
        setCreditCards(data);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load credit cards', err);
        toast.error(err instanceof Error ? err.message : 'Failed to load credit cards');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  const createCreditCard = useCallback(
    async (data: Pick<CreditCard, 'name' | 'bankName' | 'cardType' | 'currency'>) => {
      if (!uid) return;
      await addDoc(collection(db, 'users', uid, 'creditCards'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [uid]
  );

  const updateCreditCard = useCallback(
    async (cardId: string, data: Partial<Pick<CreditCard, 'name' | 'bankName' | 'cardNumber' | 'cardType'>>) => {
      if (!uid) return;
      await updateDoc(doc(db, 'users', uid, 'creditCards', cardId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    [uid]
  );

  const deleteCreditCard = useCallback(
    async (cardId: string) => {
      if (!uid) return;
      await deleteDoc(doc(db, 'users', uid, 'creditCards', cardId));
    },
    [uid]
  );

  return { creditCards, loading, createCreditCard, updateCreditCard, deleteCreditCard };
}
