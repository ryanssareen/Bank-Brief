'use client';

import Link from 'next/link';
import { Landmark, Mail, MapPin, ArrowUpRight } from 'lucide-react';
import { GithubIcon } from '@/components/ui/GithubIcon';

export default function ContactPage() {
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
            <Link href="/features" className="text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
              Features
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

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-text-primary tracking-tight">
              Get in touch
            </h1>
            <p className="mt-4 text-lg text-text-secondary max-w-xl mx-auto">
              Have a question, suggestion, or just want to say hi? Reach out through any of the channels below.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
            <a
              href="https://github.com/ryanssareen/bank-brief"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-gray-100 p-8 text-center hover:border-gray-900 hover:shadow-xl hover:shadow-gray-100 transition-all duration-300"
            >
              <div className="h-14 w-14 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-5">
                <GithubIcon className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold text-text-primary text-lg">GitHub</h3>
              <p className="mt-2 text-sm text-text-secondary">View source, report issues, or contribute</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gray-900 group-hover:gap-2 transition-all">
                ryanssareen/bank-brief
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </a>

            <a
              href="mailto:ryansareen6@gmail.com"
              className="group relative overflow-hidden rounded-2xl border border-gray-100 p-8 text-center hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-5">
                <Mail className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold text-text-primary text-lg">Email</h3>
              <p className="mt-2 text-sm text-text-secondary">For questions, feedback, or collaborations</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                ryansareen6@gmail.com
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </a>

            <div className="rounded-2xl border border-gray-100 p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-teal-500 flex items-center justify-center mx-auto mb-5">
                <MapPin className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold text-text-primary text-lg">Location</h3>
              <p className="mt-2 text-sm text-text-secondary">Built with love from</p>
              <p className="mt-4 text-sm font-medium text-text-primary">India</p>
            </div>
          </div>

          {/* Open source banner */}
          <div className="rounded-2xl bg-bg-page border border-gray-100 p-10 sm:p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-6">
              <GithubIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
              Open Source
            </h2>
            <p className="mt-3 text-text-secondary max-w-lg mx-auto">
              Bank Brief is open source. Star the repo, fork it, submit a PR, or open an issue — all contributions are welcome.
            </p>
            <a
              href="https://github.com/ryanssareen/bank-brief"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-8 bg-gray-900 text-white font-medium px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              <GithubIcon className="h-5 w-5" />
              View on GitHub
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <Landmark className="h-4 w-4" />
            Bank Brief
          </div>
          <div className="flex items-center gap-6 text-sm text-text-secondary">
            <Link href="/" className="hover:text-text-primary transition-colors">Home</Link>
            <Link href="/features" className="hover:text-text-primary transition-colors">Features</Link>
            <Link href="/login" className="hover:text-text-primary transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
