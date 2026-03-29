'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import {
  Landmark,
  ArrowRight,
  BarChart3,
  Shield,
  Zap,
  PiggyBank,
  FileText,
  Mail,
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Smart Parsing',
    desc: 'Upload PDF or Excel bank statements and let AI extract every transaction automatically.',
  },
  {
    icon: BarChart3,
    title: 'Visual Insights',
    desc: 'Interactive charts break down your spending by category, trends, and monthly patterns.',
  },
  {
    icon: PiggyBank,
    title: 'FD Tracker',
    desc: 'Track fixed deposits across banks with maturity projections and interest calculations.',
  },
  {
    icon: Zap,
    title: 'AI Powered',
    desc: 'Groq-powered analysis generates actionable financial insights in seconds.',
  },
  {
    icon: Shield,
    title: 'Private & Secure',
    desc: 'Your data stays yours. Firebase Auth protects every account with industry-grade security.',
  },
  {
    icon: Mail,
    title: 'Email Reports',
    desc: 'Get beautifully formatted summaries delivered straight to your inbox.',
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-text-primary">Bank Brief</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/features" className="text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
              Features
            </Link>
            <Link href="/contact" className="text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
              Contact
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary-light transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-light transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-primary-light text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <Zap className="h-3.5 w-3.5" />
            Powered by AI
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-text-primary tracking-tight leading-[1.1]">
            Your finances,
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              simplified.
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Upload bank statements, get AI-powered insights, track deposits,
            and understand your money — all in one beautiful dashboard.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary text-white font-medium px-8 py-3.5 rounded-xl hover:bg-primary-light transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 text-text-secondary font-medium px-8 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:text-text-primary transition-colors"
            >
              See Features
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-100 bg-bg-page">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { val: '100%', label: 'Free to use' },
            { val: 'AI', label: 'Powered insights' },
            { val: '3', label: 'File formats' },
            { val: '∞', label: 'Bank accounts' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-primary">{s.val}</p>
              <p className="text-sm text-text-secondary mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
              Everything you need
            </h2>
            <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
              From statement parsing to smart insights — Bank Brief handles it all.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <Icon className="h-5 w-5 text-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-semibold text-text-primary text-lg">{title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-primary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to understand your money?
          </h2>
          <p className="mt-4 text-white/70 text-lg">
            Join Bank Brief and turn your bank statements into clarity.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 mt-8 bg-white text-primary font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Get Started — It&apos;s Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <Landmark className="h-4 w-4" />
            Bank Brief
          </div>
          <div className="flex items-center gap-6 text-sm text-text-secondary">
            <Link href="/features" className="hover:text-text-primary transition-colors">Features</Link>
            <Link href="/contact" className="hover:text-text-primary transition-colors">Contact</Link>
            <Link href="/login" className="hover:text-text-primary transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
