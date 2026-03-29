# Bank Brief — Full Implementation Plan

> **For AI Assistants:** This document is a complete, self-contained implementation blueprint.
> Read it top to bottom before writing any code. Every decision has already been made —
> your job is to implement exactly what is described here, in the order specified.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Environment Variables](#3-environment-variables)
4. [Folder Structure](#4-folder-structure)
5. [Database Schema (Firestore)](#5-database-schema-firestore)
6. [Authentication & Login Flow](#6-authentication--login-flow)
7. [Feature Requirements](#7-feature-requirements)
8. [API Routes Specification](#8-api-routes-specification)
9. [Page & Component Breakdown](#9-page--component-breakdown)
10. [UI & Design Guidelines](#10-ui--design-guidelines)
11. [Implementation Order](#11-implementation-order)

---

## 1. Project Overview

**Bank Brief** transforms raw banking data into meaningful financial insights.

Users can:
- Create multiple bank accounts within the app
- Upload PDF or Excel bank statements per account
- Get AI-generated summaries per account
- View an overall portfolio dashboard across all accounts
- Track Fixed Deposits (FD) separately
- Receive email reports of their summaries

**Target users:** Individuals managing personal finances across multiple bank accounts.

---

## 2. Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Framework | Next.js | v14, App Router, TypeScript |
| Styling | Tailwind CSS | v3, configured via `tailwind.config.ts` |
| Backend-as-a-service | Firebase | Spark (free) plan |
| Authentication | Firebase Auth | Email + Password only |
| Database | Firestore | NoSQL, real-time |
| File Storage | Firebase Storage | For uploaded PDFs and Excel files |
| AI / LLM | Groq API | Model: `llama-3.3-70b-versatile` |
| Document Parsing | LlamaIndex Cloud (LlamaParse) | PDF + Excel → structured text |
| Email | Brevo (formerly Sendinblue) | Transactional, 300/day free |
| Charts | Recharts | v2 |
| Icons | Lucide React | |
| Date handling | date-fns | |
| File upload UI | react-dropzone | |
| Toast notifications | react-hot-toast | |
| Deployment | Vercel | Auto-deploy from GitHub `main` branch |
| Repository | GitHub | `https://github.com/ryanssareen/Bank-Brief` |

### Key npm packages to install
```bash
npm install firebase groq-sdk
npm install llamaindex @llamaindex/cloud
npm install pdf-parse xlsx @types/pdf-parse
npm install @getbrevo/brevo
npm install recharts lucide-react date-fns
npm install react-dropzone react-hot-toast
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-dropdown-menu
```

---

## 3. Environment Variables

All variables live in `.env.local` at the project root. This file is gitignored.
For Vercel deployment, add all these in: Vercel Dashboard → Project → Settings → Environment Variables.

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bank-brief.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=bank-brief
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bank-brief.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=604670408771
NEXT_PUBLIC_FIREBASE_APP_ID=

# Groq AI
GROQ_API_KEY=

# LlamaParse
LLAMA_PARSE_API_KEY=

# Brevo Email
BREVO_API_KEY=
BREVO_SENDER_EMAIL=ryansareen6@gmail.com
BREVO_SENDER_NAME=Bank Brief

# App
NEXTAUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note for AI:** Do NOT hardcode any of these values. Always read from `process.env`.

---

## 4. Folder Structure

Create exactly this structure under `src/`:

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── accounts/
│   │   └── [id]/
│   │       └── page.tsx
│   ├── fixed-deposits/
│   │   └── page.tsx
│   ├── api/
│   │   ├── parse-document/
│   │   │   └── route.ts
│   │   ├── analyze/
│   │   │   └── route.ts
│   │   └── send-email/
│   │       └── route.ts
│   ├── layout.tsx
│   ├── page.tsx              ← redirects to /dashboard if logged in, else /login
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   └── Spinner.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── AppShell.tsx
│   ├── charts/
│   │   ├── SpendingBarChart.tsx
│   │   ├── CategoryPieChart.tsx
│   │   └── TrendLineChart.tsx
│   ├── accounts/
│   │   ├── AccountCard.tsx
│   │   ├── AccountList.tsx
│   │   ├── CreateAccountModal.tsx
│   │   └── AccountSummary.tsx
│   ├── upload/
│   │   └── FileUploader.tsx
│   ├── fixed-deposits/
│   │   ├── FDCard.tsx
│   │   ├── FDList.tsx
│   │   └── AddFDModal.tsx
│   └── dashboard/
│       ├── OverallSummary.tsx
│       └── InsightCard.tsx
├── lib/
│   ├── firebase/
│   │   ├── config.ts         ← Firebase init
│   │   ├── auth.ts           ← Auth helpers
│   │   ├── firestore.ts      ← Firestore CRUD helpers
│   │   └── storage.ts        ← Storage upload helpers
│   ├── groq/
│   │   └── client.ts         ← Groq client + prompt functions
│   ├── llamaparse/
│   │   └── parser.ts         ← Document parsing helpers
│   └── brevo/
│       └── email.ts          ← Email sending helpers
├── hooks/
│   ├── useAuth.ts
│   ├── useAccounts.ts
│   └── useFixedDeposits.ts
├── types/
│   └── index.ts              ← All TypeScript interfaces
└── utils/
    ├── formatCurrency.ts
    ├── formatDate.ts
    └── parseTransactions.ts
```

---

## 5. Database Schema (Firestore)

### Collection: `users`
```
users/{uid}
  ├── email: string
  ├── displayName: string
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

### Sub-collection: `users/{uid}/accounts`
```
users/{uid}/accounts/{accountId}
  ├── id: string                  ← same as document ID
  ├── name: string                ← e.g. "HDFC Savings", "SBI Salary"
  ├── bankName: string            ← e.g. "HDFC Bank"
  ├── accountType: string         ← "savings" | "current" | "salary"
  ├── currency: string            ← default "INR"
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

### Sub-collection: `users/{uid}/accounts/{accountId}/statements`
```
users/{uid}/accounts/{accountId}/statements/{statementId}
  ├── id: string
  ├── fileName: string            ← original uploaded file name
  ├── fileUrl: string             ← Firebase Storage download URL
  ├── fileType: string            ← "pdf" | "xlsx" | "csv"
  ├── uploadedAt: Timestamp
  ├── periodStart: string         ← "YYYY-MM" format
  ├── periodEnd: string           ← "YYYY-MM" format
  ├── status: string              ← "processing" | "done" | "error"
  ├── rawText: string             ← extracted text from LlamaParse
  └── summary: {                  ← populated after Groq analysis
        totalCredits: number
        totalDebits: number
        openingBalance: number
        closingBalance: number
        topCategories: { name: string, amount: number }[]
        insights: string[]        ← array of AI-generated insight strings
        generatedAt: Timestamp
      }
```

### Collection: `fixedDeposits`
```
fixedDeposits/{fdId}
  ├── id: string
  ├── userId: string              ← links to users/{uid}
  ├── bankName: string
  ├── principalAmount: number
  ├── interestRate: number        ← annual percentage, e.g. 7.5
  ├── tenureMonths: number
  ├── startDate: string           ← "YYYY-MM-DD"
  ├── maturityDate: string        ← "YYYY-MM-DD"
  ├── maturityAmount: number      ← calculated at creation
  ├── compoundingFrequency: string ← "monthly" | "quarterly" | "annually"
  ├── status: string              ← "active" | "matured" | "broken"
  ├── notes: string               ← optional
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Fixed deposits — user can only access their own
    match /fixedDeposits/{fdId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

---

## 6. Authentication & Login Flow

### Overview
Firebase Auth with Email + Password only. No social logins in v1.

### Route Protection
- `/login` and `/register` → accessible only when **NOT** logged in
- `/dashboard`, `/accounts/*`, `/fixed-deposits` → accessible only when **logged in**
- `/` (root) → redirect to `/dashboard` if logged in, else redirect to `/login`

### Implementation: `src/lib/firebase/auth.ts`
```typescript
// Functions to implement:
signUpWithEmail(email: string, password: string, displayName: string): Promise<User>
signInWithEmail(email: string, password: string): Promise<User>
signOut(): Promise<void>
onAuthChange(callback: (user: User | null) => void): Unsubscribe
resetPassword(email: string): Promise<void>
```

### Implementation: `src/hooks/useAuth.ts`
```typescript
// Returns:
{
  user: User | null
  loading: boolean
  signIn: (email, password) => Promise<void>
  signUp: (email, password, displayName) => Promise<void>
  signOut: () => Promise<void>
}
```

### Middleware: `src/middleware.ts`
Use Next.js middleware to protect routes. Check for Firebase session cookie.
Redirect unauthenticated users from protected routes to `/login`.
Redirect authenticated users from `/login` and `/register` to `/dashboard`.

### Login Page Flow (`/login`)
```
1. User lands on /login
2. Sees email + password form
3. On submit → call signInWithEmail()
4. On success → redirect to /dashboard
5. On error → show toast with error message
6. "Don't have an account?" link → /register
7. "Forgot password?" link → trigger resetPassword() → show success toast
```

### Register Page Flow (`/register`)
```
1. User lands on /register
2. Sees: Full Name, Email, Password, Confirm Password fields
3. Validate: passwords match, password min 8 chars
4. On submit → call signUpWithEmail()
5. On success → create user document in Firestore users/{uid}
6. Redirect to /dashboard
7. "Already have an account?" link → /login
```

### Session Persistence
Use Firebase's `setPersistence(browserLocalPersistence)` so users stay logged in across page refreshes.

---

## 7. Feature Requirements

### 7.1 Account Management

**Create Account**
- Modal with fields: Account Nickname, Bank Name, Account Type (savings/current/salary), Currency (default INR)
- On save → create document in `users/{uid}/accounts`
- Account appears in sidebar and dashboard immediately

**View Accounts**
- List all accounts as cards on dashboard
- Each card shows: account name, bank name, latest balance (from most recent statement), account type badge

**Delete Account**
- Confirmation modal before deletion
- Deletes account document and all sub-collections (statements)
- Also deletes associated files from Firebase Storage

### 7.2 Statement Upload & Parsing

**File Upload**
- Drag-and-drop or click-to-browse using `react-dropzone`
- Accepted formats: `.pdf`, `.xlsx`, `.xls`, `.csv`
- Max file size: 10MB
- Show upload progress bar
- On upload:
  1. Upload file to Firebase Storage at path: `users/{uid}/accounts/{accountId}/{filename}`
  2. Create statement document in Firestore with `status: "processing"`
  3. Call `/api/parse-document` with the file
  4. On parse success → call `/api/analyze` with extracted text
  5. Save summary back to Firestore statement document
  6. Update `status: "done"`

**Supported Statement Formats**
- Any Indian bank PDF statement (HDFC, SBI, ICICI, Axis, Kotak, etc.)
- Excel exports from net banking
- CSV exports

### 7.3 Individual Account Summary

**Route:** `/accounts/[id]`

**Displays:**
- Account name and bank
- Statement selector (dropdown if multiple statements uploaded)
- Summary cards:
  - Total Credits (money in)
  - Total Debits (money out)
  - Opening Balance
  - Closing Balance
  - Net Change
- Bar chart: Monthly spending by category
- Pie chart: Spending breakdown by category
- Line chart: Balance trend over statement period
- AI Insights section: bulleted list of Groq-generated insights
- Transaction table: Date, Description, Amount, Type (credit/debit), Category
- "Send Report to Email" button → calls `/api/send-email`

### 7.4 Overall Dashboard Summary

**Route:** `/dashboard`

**Displays:**
- Welcome message with user's name
- Summary cards (aggregated across ALL accounts):
  - Total Balance (sum of closing balances)
  - Total Monthly Income
  - Total Monthly Expenses
  - Net Savings
- Account cards list (click to go to individual account)
- Combined category breakdown pie chart (all accounts)
- Top spending categories ranked list
- FD summary widget (total FD value, next maturity date)
- "Add Account" button

### 7.5 Fixed Deposits Module

**Route:** `/fixed-deposits`

**Add FD Modal fields:**
- Bank Name
- Principal Amount (₹)
- Interest Rate (% per annum)
- Tenure (in months)
- Start Date
- Compounding Frequency (monthly / quarterly / annually)
- Notes (optional)

**Auto-calculated on creation:**
- Maturity Date (start date + tenure months)
- Maturity Amount using compound interest formula:
  `A = P × (1 + r/n)^(n×t)`
  where P = principal, r = annual rate/100, n = compounding periods per year, t = years

**FD List View:**
- Cards for each FD showing:
  - Bank name
  - Principal amount
  - Interest rate + tenure
  - Start date → Maturity date
  - Maturity amount
  - Days remaining to maturity
  - Status badge (Active / Matured / Broken)
- Sort by: Maturity date (soonest first) by default

**FD Summary (shown on dashboard widget):**
- Total principal invested
- Total maturity value
- Total interest earned
- Next maturity: FD name + date

**Edit/Delete FD:**
- Edit all fields (recalculates maturity amount)
- Delete with confirmation

### 7.6 Email Reports

**Trigger:** "Send Report to Email" button on account summary page or dashboard

**API:** `POST /api/send-email`

**Email content:**
- Subject: `Bank Brief — [Account Name] Statement Summary`
- HTML email with:
  - Account name and period
  - Summary table (credits, debits, balance)
  - Top 5 spending categories
  - AI insights list
  - Footer with Bank Brief branding

**Brevo implementation:**
- Use `@getbrevo/brevo` SDK
- `TransactionalEmailsApi` → `sendTransacEmail()`
- Sender: `{ name: "Bank Brief", email: process.env.BREVO_SENDER_EMAIL }`

---

## 8. API Routes Specification

### `POST /api/parse-document`

**Purpose:** Extract structured text from uploaded PDF or Excel file

**Request:** `multipart/form-data`
```
file: File        ← the uploaded PDF or Excel
fileType: string  ← "pdf" | "xlsx" | "csv"
```

**Implementation:**
```typescript
// For PDF: Use LlamaParse
import { LlamaParseReader } from "llamaindex";
const reader = new LlamaParseReader({ resultType: "markdown" });
const documents = await reader.loadData(filePath);

// For Excel/CSV: Use xlsx library
import * as XLSX from 'xlsx';
const workbook = XLSX.read(fileBuffer);
const text = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
```

**Response:**
```json
{
  "success": true,
  "extractedText": "...",
  "pageCount": 3
}
```

---

### `POST /api/analyze`

**Purpose:** Generate financial insights from extracted statement text using Groq

**Request body:**
```json
{
  "extractedText": "...",
  "accountName": "HDFC Savings",
  "currency": "INR"
}
```

**Groq prompt (use exactly this structure):**
```
You are a financial analyst assistant. Analyze the following bank statement text and extract structured financial data.

Return a JSON object with EXACTLY this structure:
{
  "totalCredits": number,
  "totalDebits": number,
  "openingBalance": number,
  "closingBalance": number,
  "topCategories": [
    { "name": "category name", "amount": number }
  ],
  "insights": [
    "insight string 1",
    "insight string 2",
    ...up to 5 insights
  ],
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "type": "credit" | "debit",
      "category": "string"
    }
  ]
}

Transaction categories to use: Food & Dining, Shopping, Transport, Utilities, Entertainment, Healthcare, Education, Travel, Salary, Investment, Transfer, Other.

Bank statement text:
{extractedText}
```

**Groq client config:**
```typescript
import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const completion = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [{ role: "user", content: prompt }],
  temperature: 0.1,       // low temperature for consistent structured output
  max_tokens: 4096,
  response_format: { type: "json_object" }
});
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalCredits": 85000,
    "totalDebits": 62000,
    "openingBalance": 45000,
    "closingBalance": 68000,
    "topCategories": [...],
    "insights": [...],
    "transactions": [...]
  }
}
```

---

### `POST /api/send-email`

**Purpose:** Send a summary report email via Brevo

**Request body:**
```json
{
  "recipientEmail": "user@email.com",
  "recipientName": "Ryan",
  "accountName": "HDFC Savings",
  "summary": { ...summary object from analyze API... }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "..."
}
```

---

## 9. Page & Component Breakdown

### `/login` page
- Full-page centered card layout
- Bank Brief logo + tagline at top
- Email input, Password input
- Sign In button (primary, full-width)
- "Forgot password?" link (triggers password reset)
- Divider
- "Create an account" link → `/register`
- Show loading spinner on submit
- Show error toast on failed login

### `/register` page
- Full-page centered card layout
- Full Name, Email, Password, Confirm Password inputs
- Password strength indicator
- Sign Up button (primary, full-width)
- "Already have an account?" link → `/login`
- On success: redirect to `/dashboard`

### `/dashboard` page
- `AppShell` wrapper (Sidebar + Header)
- Header shows: "Good morning/afternoon, [Name]"
- 4 summary stat cards (total balance, income, expenses, savings)
- Account cards grid (2 columns on desktop)
- "Add Account" button (opens `CreateAccountModal`)
- Combined spending pie chart
- FD summary widget (if any FDs exist)

### `/accounts/[id]` page
- `AppShell` wrapper
- Account header: name, bank, account type badge
- "Upload Statement" button → opens `FileUploader`
- Statement selector dropdown (if multiple)
- 5 summary stat cards
- Tab navigation: Overview | Transactions | Insights
  - **Overview tab:** bar chart + pie chart + trend line
  - **Transactions tab:** sortable/filterable table
  - **Insights tab:** AI insight cards + "Send Report" button

### `/fixed-deposits` page
- `AppShell` wrapper
- Summary banner: total invested, total maturity value, total interest
- "Add Fixed Deposit" button → opens `AddFDModal`
- FD cards grid (sorted by maturity date)
- Filter tabs: All | Active | Matured

### Sidebar (`src/components/layout/Sidebar.tsx`)
- Bank Brief logo at top
- Navigation links:
  - Dashboard (icon: LayoutDashboard)
  - Accounts (icon: Wallet) — expandable to list account names
  - Fixed Deposits (icon: PiggyBank)
- Bottom: user avatar + email + Sign Out button

---

## 10. UI & Design Guidelines

### Color Palette
```css
/* Primary */
--color-primary: #1B3A5C       /* Navy blue — headers, primary buttons */
--color-primary-light: #2563EB /* Bright blue — links, accents */

/* Backgrounds */
--color-bg-page: #F8FAFC       /* Light gray page background */
--color-bg-card: #FFFFFF       /* White cards */
--color-bg-sidebar: #1B3A5C   /* Navy sidebar */

/* Text */
--color-text-primary: #0F172A
--color-text-secondary: #64748B
--color-text-inverse: #FFFFFF  /* text on dark backgrounds */

/* Status */
--color-success: #0D9488       /* Teal — credits, positive */
--color-danger: #E11D48        /* Rose — debits, negative */
--color-warning: #D97706       /* Amber — warnings, FD */
--color-info: #2563EB          /* Blue — info badges */
```

### Typography
- Font: `Inter` (import from Google Fonts)
- Headings: `font-weight: 600`
- Body: `font-weight: 400`
- Currency values: Always prefix with `₹` and use `toLocaleString('en-IN')`

### Component Styling Rules
- Cards: `rounded-xl shadow-sm border border-gray-100 bg-white p-6`
- Primary button: `bg-[#1B3A5C] text-white rounded-lg px-4 py-2 hover:bg-[#2563EB] transition`
- Input fields: `border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500`
- Sidebar width: `w-64` (desktop), hidden on mobile with hamburger toggle

### Responsive Breakpoints
- Mobile: single column, sidebar hidden
- Tablet (md: 768px): sidebar as drawer
- Desktop (lg: 1024px): sidebar always visible, 2-column grids

### Charts (Recharts)
- Bar chart colors: `#2563EB` (credits), `#E11D48` (debits)
- Pie chart: use the top 6 categories with distinct colors, "Other" in gray
- All charts: `ResponsiveContainer width="100%" height={300}`
- Tooltips: show `₹` formatted values

---

## 11. Implementation Order

Follow this exact order. Each phase should result in working, testable code before moving on.

### Phase 1 — Foundation
- [ ] `src/lib/firebase/config.ts` — Firebase initialisation
- [ ] `src/lib/firebase/auth.ts` — Auth helper functions
- [ ] `src/hooks/useAuth.ts` — Auth hook
- [ ] `src/middleware.ts` — Route protection
- [ ] `src/types/index.ts` — All TypeScript interfaces
- [ ] `src/app/layout.tsx` — Root layout with Toaster

### Phase 2 — Auth UI
- [ ] `src/app/(auth)/login/page.tsx`
- [ ] `src/app/(auth)/register/page.tsx`
- [ ] `src/components/ui/` — Button, Input, Card, Spinner, Badge, Modal

### Phase 3 — App Shell & Navigation
- [ ] `src/components/layout/Sidebar.tsx`
- [ ] `src/components/layout/Header.tsx`
- [ ] `src/components/layout/AppShell.tsx`

### Phase 4 — Account Management
- [ ] `src/lib/firebase/firestore.ts` — Firestore CRUD helpers
- [ ] `src/lib/firebase/storage.ts` — Storage helpers
- [ ] `src/hooks/useAccounts.ts`
- [ ] `src/components/accounts/CreateAccountModal.tsx`
- [ ] `src/components/accounts/AccountCard.tsx`
- [ ] `src/components/accounts/AccountList.tsx`
- [ ] `src/app/dashboard/page.tsx` — basic version with account list

### Phase 5 — Document Pipeline
- [ ] `src/lib/llamaparse/parser.ts`
- [ ] `src/app/api/parse-document/route.ts`
- [ ] `src/lib/groq/client.ts`
- [ ] `src/app/api/analyze/route.ts`
- [ ] `src/components/upload/FileUploader.tsx`

### Phase 6 — Account Summary Page
- [ ] `src/components/charts/SpendingBarChart.tsx`
- [ ] `src/components/charts/CategoryPieChart.tsx`
- [ ] `src/components/charts/TrendLineChart.tsx`
- [ ] `src/components/accounts/AccountSummary.tsx`
- [ ] `src/app/accounts/[id]/page.tsx`

### Phase 7 — Email
- [ ] `src/lib/brevo/email.ts`
- [ ] `src/app/api/send-email/route.ts`
- [ ] Wire "Send Report" button on account page

### Phase 8 — Fixed Deposits
- [ ] `src/hooks/useFixedDeposits.ts`
- [ ] `src/components/fixed-deposits/AddFDModal.tsx`
- [ ] `src/components/fixed-deposits/FDCard.tsx`
- [ ] `src/components/fixed-deposits/FDList.tsx`
- [ ] `src/app/fixed-deposits/page.tsx`

### Phase 9 — Dashboard Polish
- [ ] Aggregate stats across all accounts
- [ ] FD widget on dashboard
- [ ] Combined category chart
- [ ] Final responsive polish

### Phase 10 — Deploy
- [ ] Add all env vars to Vercel
- [ ] Update `NEXT_PUBLIC_APP_URL` to Vercel domain
- [ ] Add Vercel domain to Firebase Authorized Domains
- [ ] Update Firestore rules from test mode to production rules
- [ ] Final smoke test on production URL

---

## Appendix A — TypeScript Interfaces (`src/types/index.ts`)

```typescript
export interface User {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

export interface Account {
  id: string;
  name: string;
  bankName: string;
  accountType: 'savings' | 'current' | 'salary';
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Statement {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: 'pdf' | 'xlsx' | 'csv';
  uploadedAt: Date;
  periodStart: string;
  periodEnd: string;
  status: 'processing' | 'done' | 'error';
  rawText?: string;
  summary?: StatementSummary;
}

export interface StatementSummary {
  totalCredits: number;
  totalDebits: number;
  openingBalance: number;
  closingBalance: number;
  topCategories: { name: string; amount: number }[];
  insights: string[];
  transactions: Transaction[];
  generatedAt: Date;
}

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
}

export interface FixedDeposit {
  id: string;
  userId: string;
  bankName: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  startDate: string;
  maturityDate: string;
  maturityAmount: number;
  compoundingFrequency: 'monthly' | 'quarterly' | 'annually';
  status: 'active' | 'matured' | 'broken';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Appendix B — Utility Functions

### `src/utils/formatCurrency.ts`
```typescript
export const formatINR = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
```

### `src/utils/formatDate.ts`
```typescript
import { format, formatDistanceToNow } from 'date-fns';
export const formatDate = (date: Date | string) => format(new Date(date), 'dd MMM yyyy');
export const timeAgo = (date: Date | string) => formatDistanceToNow(new Date(date), { addSuffix: true });
```

### `src/utils/parseTransactions.ts`
```typescript
// Calculates FD maturity amount
export const calculateFDMaturity = (
  principal: number,
  annualRate: number,
  tenureMonths: number,
  frequency: 'monthly' | 'quarterly' | 'annually'
): number => {
  const n = frequency === 'monthly' ? 12 : frequency === 'quarterly' ? 4 : 1;
  const t = tenureMonths / 12;
  const r = annualRate / 100;
  return Math.round(principal * Math.pow(1 + r / n, n * t));
};
```

---

*End of implementation plan. All decisions are final. Implement in the order specified.*
