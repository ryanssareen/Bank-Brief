'use client';

import Link from 'next/link';
import {
  Landmark,
  ArrowRight,
  FileText,
  BarChart3,
  PiggyBank,
  Zap,
  Shield,
  Mail,
  Upload,
  TrendingUp,
  Wallet,
  Globe,
  Layers,
  Eye,
} from 'lucide-react';

const highlights = [
  {
    icon: Upload,
    title: 'Drag & Drop Upload',
    desc: 'Simply drop your PDF, Excel, or CSV bank statements. We support all major Indian banks — HDFC, SBI, ICICI, Axis, Kotak, and more.',
    color: 'bg-blue-500',
  },
  {
    icon: Zap,
    title: 'AI-Powered Analysis',
    desc: 'Our Groq-powered LLM reads your statement, categorizes every transaction, and generates up to 5 actionable financial insights — in seconds.',
    color: 'bg-amber-500',
  },
  {
    icon: BarChart3,
    title: 'Beautiful Visualizations',
    desc: 'Interactive bar charts, pie charts, and trend lines make it easy to see where your money goes each month.',
    color: 'bg-teal-500',
  },
  {
    icon: Wallet,
    title: 'Multi-Account Dashboard',
    desc: 'Manage savings, current, and salary accounts across banks. See aggregated stats in one unified view.',
    color: 'bg-violet-500',
  },
  {
    icon: PiggyBank,
    title: 'Fixed Deposit Tracker',
    desc: 'Log your FDs with interest rates, tenure, and compounding frequency. We calculate maturity amounts and track days remaining.',
    color: 'bg-rose-500',
  },
  {
    icon: Mail,
    title: 'Email Reports',
    desc: 'Send yourself a beautifully formatted summary report with top categories, balance overview, and AI insights.',
    color: 'bg-emerald-500',
  },
];

const extras = [
  { icon: Shield, text: 'Firebase Auth with email & Google sign-in' },
  { icon: Globe, text: 'Works on desktop, tablet, and mobile' },
  { icon: Layers, text: 'Multiple statements per account' },
  { icon: TrendingUp, text: 'Balance trend tracking over time' },
  { icon: Eye, text: 'Transaction table with category badges' },
  { icon: FileText, text: 'PDF, XLSX, XLS, and CSV support' },
];

export default function FeaturesPage() {
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
            <Link href="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
              Home
            </Link>
            <Link href="/contact" className="text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
              Contact
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
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary tracking-tight">
            Features
          </h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            Everything Bank Brief offers to help you understand and manage your finances better.
          </p>
        </div>
      </section>

      {/* Main features */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {highlights.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="relative overflow-hidden rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-100 transition-all duration-300">
              <div className={`h-12 w-12 rounded-2xl ${color} flex items-center justify-center mb-5`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">{title}</h3>
              <p className="text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-bg-page">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-text-primary text-center mb-16">
            How it works
          </h2>
          <div className="space-y-0">
            {[
              { step: '01', title: 'Create an account', desc: 'Sign up with email or Google in seconds. Add your bank accounts to get started.' },
              { step: '02', title: 'Upload a statement', desc: 'Drag and drop your bank statement PDF, Excel, or CSV file.' },
              { step: '03', title: 'Get instant insights', desc: 'AI parses every transaction, categorizes spending, and generates a full summary.' },
              { step: '04', title: 'Track & share', desc: 'View charts, monitor trends, track FDs, and email yourself reports.' },
            ].map(({ step, title, desc }, i) => (
              <div key={step} className="flex gap-6 sm:gap-10">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {step}
                  </div>
                  {i < 3 && <div className="w-px h-full bg-gray-200 my-2" />}
                </div>
                <div className="pb-12">
                  <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                  <p className="mt-1 text-text-secondary">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extras grid */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
            And more...
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {extras.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 p-4 rounded-xl bg-bg-page">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm text-text-primary">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-primary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">
            Start making sense of your money
          </h2>
          <p className="mt-3 text-white/70">
            No credit card. No hidden fees. Just clarity.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 mt-8 bg-white text-primary font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Create Free Account
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
            <Link href="/" className="hover:text-text-primary transition-colors">Home</Link>
            <Link href="/contact" className="hover:text-text-primary transition-colors">Contact</Link>
            <Link href="/login" className="hover:text-text-primary transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
