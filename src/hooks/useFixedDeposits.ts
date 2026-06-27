'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
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
import type { FixedDeposit } from '@/types';

export function useFixedDeposits(uid: string | undefined) {
  const [deposits, setDeposits] = useState<FixedDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setDeposits([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'fixedDeposits'),
      where('userId', '==', uid),
      orderBy('maturityDate', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate() ?? new Date(),
        })) as FixedDeposit[];
        setDeposits(data);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load fixed deposits', err);
        toast.error(err instanceof Error ? err.message : 'Failed to load fixed deposits');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  const addDeposit = useCallback(
    async (data: Omit<FixedDeposit, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!uid) return;
      await addDoc(collection(db, 'fixedDeposits'), {
        ...data,
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [uid]
  );

  const updateDeposit = useCallback(
    async (fdId: string, data: Partial<FixedDeposit>) => {
      await updateDoc(doc(db, 'fixedDeposits', fdId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    },
    []
  );

  const deleteDeposit = useCallback(async (fdId: string) => {
    await deleteDoc(doc(db, 'fixedDeposits', fdId));
  }, []);

  return { deposits, loading, addDeposit, updateDeposit, deleteDeposit };
}
