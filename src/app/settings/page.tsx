'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { resetPassword } from '@/lib/firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '@/lib/firebase/config';
import { Sun, Moon, User, Lock, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const isGoogleUser = user?.providerData?.some((p) => p.providerId === 'google.com') ?? false;

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  const handleUpdateProfile = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await resetPassword(user.email);
      toast.success('Password reset email sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your profile and preferences</p>
        </div>

        {/* Profile */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Profile</h2>
              <p className="text-xs text-text-secondary">Your personal information</p>
            </div>
          </div>
          <div className="space-y-4">
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
            <Input
              label="Email"
              value={user?.email ?? ''}
              disabled
              className="opacity-60"
            />
            <Button onClick={handleUpdateProfile} loading={saving} size="md">
              Save Changes
            </Button>
          </div>
        </Card>

        {/* Appearance */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Appearance</h2>
              <p className="text-xs text-text-secondary">Customize how Bank Brief looks</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer
                ${theme === 'light'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-border'}`}
            >
              <Sun className={`h-5 w-5 ${theme === 'light' ? 'text-primary' : 'text-text-secondary'}`} />
              <div className="text-left">
                <p className={`text-sm font-medium ${theme === 'light' ? 'text-primary' : 'text-text-primary'}`}>Light</p>
                <p className="text-xs text-text-secondary">Clean and bright</p>
              </div>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer
                ${theme === 'dark'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-border'}`}
            >
              <Moon className={`h-5 w-5 ${theme === 'dark' ? 'text-primary' : 'text-text-secondary'}`} />
              <div className="text-left">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-primary' : 'text-text-primary'}`}>Dark</p>
                <p className="text-xs text-text-secondary">Easy on the eyes</p>
              </div>
            </button>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Security</h2>
              <p className="text-xs text-text-secondary">Manage your account security</p>
            </div>
          </div>
          {isGoogleUser ? (
            <div className="p-4 rounded-xl bg-bg-page">
              <p className="text-sm font-medium text-text-primary">Signed in with Google</p>
              <p className="text-xs text-text-secondary mt-0.5">Password is managed by your Google account</p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-xl bg-bg-page">
              <div>
                <p className="text-sm font-medium text-text-primary">Password</p>
                <p className="text-xs text-text-secondary mt-0.5">Send a password reset link to your email</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetPassword}
                loading={sendingReset}
              >
                Reset Password
            </Button>
          </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
