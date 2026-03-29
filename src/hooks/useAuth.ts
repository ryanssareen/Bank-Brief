'use client';

import { useState, useEffect, useCallback } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOut as firebaseSignOut,
  onAuthChange,
} from '@/lib/firebase/auth';

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmail(email, password);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      await signUpWithEmail(email, password, displayName);
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    await firebaseSignInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut();
  }, []);

  return { user, loading, signIn, signUp, signInWithGoogle, signOut };
}
