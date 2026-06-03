# HOLDFAST v2

**On-Chain Insurance Claims Verification — Single & Multi-Party**

> Submit your claim. We hold it to the truth.

---

## What's new in v2

| Feature | v1 | v2 |
|---------|----|----|
| Single-party claims | ✓ | ✓ |
| Multi-party disputed claims | ✗ | ✓ |
| AI comparative analysis | ✗ | ✓ |
| WhatsApp share for respondent code | ✗ | ✓ |
| 7-day uncontested window | ✗ | ✓ |
| Plain-language verdict copy | ✗ | ✓ |
| Score label (not just number) | ✗ | ✓ |
| Party B independent submission | ✗ | ✓ |

---

## How it works

### Solo Claim (no other party)
1. Describe the incident
2. Describe your evidence
3. AI generates 4 targeted questions
4. Answer the questions
5. AI renders verdict + credibility score

### Disputed Claim (two parties)
1. Party A completes all 4 stages
2. Party A shares a Respondent Code with Party B (via WhatsApp or link)
3. Party B joins and completes their own 4 stages independently
4. Neither party sees the other's submission
5. AI reads both accounts and produces a comparative analysis

---

## AI Calls

| Mode | Call 1 | Call 2 | Call 3 |
|------|--------|--------|--------|
| Single | generate_questions | calculate_verdict | — |
| Multi | generate_questions_a | generate_questions_b | calculate_comparative_verdict |

---

## Setup

### 1. Install
```bash
npm install
```

### 2. Deploy contract
Open GenLayer Studio → New Project → paste `Contracts/holdfast_v2_contract.py` → Deploy to studionet → copy the contract address.

### 3. Set environment variable
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_your_address_here
```

### 4. Deploy to Vercel
Push to GitHub → import in Vercel → add env var → deploy.

---

## Project structure

```
holdfast-v2/
├── Contracts/
│   └── holdfast_v2_contract.py
├── app/
│   ├── App.tsx                    # Orchestrator — dual routing for SINGLE + MULTI
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── LandingScreen.tsx          # 3 entry points: Start, Join, Lookup
│   ├── ClaimTypeScreen.tsx
│   ├── ClaimModeScreen.tsx        # NEW — Solo vs Disputed selector
│   ├── IncidentScreen.tsx         # Shared — Party A and B
│   ├── EvidenceScreen.tsx         # Shared — Party A and B
│   ├── QuestionsLoading.tsx       # Shared — all AI question waits
│   ├── AnswersScreen.tsx          # Shared — Party A and B
│   ├── VerdictLoading.tsx         # Shared — single + multi
│   ├── ShareScreen.tsx            # NEW — Party A shares respondent code
│   ├── WaitingScreen.tsx          # NEW — Party A waiting for Party B
│   ├── JoinScreen.tsx             # NEW — Party B entry
│   ├── ResultsScreen.tsx          # Single-party verdict
│   ├── ResultsMultiScreen.tsx     # NEW — comparative verdict
│   ├── ResultsUncontestedScreen.tsx # NEW — 7-day timeout
│   └── ClaimLookupScreen.tsx      # Updated — handles both modes
├── lib/
│   └── contract.ts
├── globals.css                    # Full design system (v1 + v2 additions)
├── types.ts                       # All types including multi-party
├── next.config.js
├── tsconfig.json
└── package.json
```
