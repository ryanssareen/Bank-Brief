# Bank Brief — API Keys Setup Guide

Get all 4 free API keys in ~15 minutes. Follow each section below.

---

## 1. 🔥 FIREBASE (Auth + Database + Storage)

**Steps:**
1. Go to https://console.firebase.google.com
2. Click **"Add project"** → Name it `bank-brief` → Continue
3. Disable Google Analytics (not needed) → **Create project**

**Enable Authentication:**
- Left sidebar → **Build → Authentication → Get started**
- Enable **Email/Password** provider → Save

**Create Firestore Database:**
- Left sidebar → **Build → Firestore Database → Create database**
- Choose **"Start in test mode"** → Select region (e.g. `asia-south1` for India) → Done

**Enable Storage:**
- Left sidebar → **Build → Storage → Get started**
- Accept defaults → Done

**Get your config keys:**
- Click the **gear icon** → Project Settings → scroll to "Your apps"
- Click `</>` (Web app) → Register app as `bank-brief-web`
- Copy the `firebaseConfig` object — these are your `.env.local` values

---

## 2. 🤖 GROQ API (Free AI — Financial Insights)

**Model used:** `llama-3.3-70b-versatile` — extremely fast and free

**Steps:**
1. Go to https://console.groq.com
2. Sign up with Google or email
3. Left sidebar → **API Keys → Create API Key**
4. Name it `bank-brief` → Copy the key
5. Paste it in `.env.local` as `GROQ_API_KEY`

**Free limits:** 14,400 requests/day · 6,000 tokens/minute — more than enough

---

## 3. 📄 LLAMAPARSE API (Free PDF & Excel Parsing)

**Purpose:** Extracts structured text from bank statement PDFs and Excel files

**Steps:**
1. Go to https://cloud.llamaindex.ai
2. Sign up with Google or email
3. Top right → **API Key → Generate new key**
4. Name it `bank-brief` → Copy the key
5. Paste it in `.env.local` as `LLAMAPARSE_API_KEY`

**Free limits:** 1,000 pages/day — perfect for personal finance use

---

## 4. 📧 BREVO (Free Email — 300 emails/day)

**Purpose:** Send summary reports and alerts to users

**Steps:**
1. Go to https://app.brevo.com → Sign up for free
2. Verify your email address
3. Top right → **Profile → SMTP & API**
4. Click **"API Keys"** tab → **Generate a new API key**
5. Name it `bank-brief` → Copy the key
6. Paste in `.env.local` as `BREVO_API_KEY`

**Verify your sender email:**
- Go to **Senders & IP → Senders → Add a sender**
- Add the email you want to send FROM (e.g. hello@yourdomain.com or your gmail)
- Verify it via the email they send you
- Paste that email as `BREVO_SENDER_EMAIL` in `.env.local`

**Free limits:** 300 emails/day, unlimited contacts

---

## 5. ✅ Final .env.local Checklist

After filling in all keys, your `.env.local` should look like:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bank-brief-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=bank-brief-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bank-brief-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

GROQ_API_KEY=gsk_...
LLAMAPARSE_API_KEY=llx-...

BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=you@youremail.com
BREVO_SENDER_NAME=Bank Brief

NEXTAUTH_SECRET=any-random-32-char-string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 6. 🔒 Security Reminders

- NEVER commit `.env.local` to GitHub (it's already in `.gitignore` ✅)
- For Vercel deployment, add the same keys in: Vercel Dashboard → Project → Settings → Environment Variables
- Firebase: before going live, change Firestore rules from "test mode" to production rules
