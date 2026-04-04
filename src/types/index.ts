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
  accountNumber?: string;
  accountType: 'savings' | 'current' | 'salary';
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryRule {
  keyword: string;
  category: string;
  subcategory?: string;
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
  balance?: number;
  category: string;
  subcategory?: string;
  matchedKeyword?: string;
  disposition?: '' | 'Ok' | 'To Be Settled';
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
