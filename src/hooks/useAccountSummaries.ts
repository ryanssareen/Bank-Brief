'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { StatementSummary, Transaction } from '@/types';

interface AccountSparkData {
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  balancePoints: number[];
}

export function useAccountSummaries(uid: string | undefined, accountIds: string[]) {
  const [data, setData] = useState<Record<string, AccountSparkData>>({});

  useEffect(() => {
    if (!uid || accountIds.length === 0) return;

    async function load() {
      const result: Record<string, AccountSparkData> = {};
      await Promise.all(
        accountIds.map(async (accId) => {
          try {
            const q = query(
              collection(db, 'users', uid!, 'accounts', accId, 'statements'),
              orderBy('uploadedAt', 'desc'),
              limit(1)
            );
            const snap = await getDocs(q);
            if (snap.empty) return;

            const summary = snap.docs[0].data().summary as StatementSummary | undefined;
            if (!summary?.transactions) return;

            const txs = [...summary.transactions].sort((a, b) => a.date.localeCompare(b.date));
            let balance = summary.openingBalance ?? 0;
            const points: number[] = [balance];
            for (const t of txs) {
              balance += t.type === 'credit' ? t.amount : -t.amount;
              points.push(balance);
            }

            const sampled = samplePoints(points, 12);

            result[accId] = {
              closingBalance: summary.closingBalance ?? balance,
              totalCredits: summary.totalCredits,
              totalDebits: summary.totalDebits,
              balancePoints: sampled,
            };
          } catch {
            // ignore per-account errors
          }
        })
      );
      setData(result);
    }

    load();
  }, [uid, accountIds.join(',')]);

  return data;
}

function samplePoints(arr: number[], maxPoints: number): number[] {
  if (arr.length <= maxPoints) return arr;
  const step = (arr.length - 1) / (maxPoints - 1);
  const result: number[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(arr[Math.round(i * step)]);
  }
  return result;
}
