// HOLDFAST — Shared TypeScript Types
// v2.0 — extends v1 with multi-party claim support
// All v1 types preserved unchanged. Multi-party types added below.

// ================================================================
// CORE ENUMS
// ================================================================

export type ClaimMode = "SINGLE" | "MULTI";

export type ClaimType =
  | "AUTO"
  | "PROPERTY"
  | "TRAVEL"
  | "DEVICE"
  | "LIABILITY"
  | "MEDICAL";

export type VerdictType = "CONSISTENT" | "REVIEW" | "CONTRADICTORY";

// Single-party recommendations (v1 unchanged)
export type Recommendation = "APPROVE" | "REVIEW" | "DENY";

// Multi-party recommendations — who does the adjuster side with?
export type ComparativeRecommendation =
  | "APPROVE_A"    // Party A's account is more credible
  | "APPROVE_B"    // Party B's account is more credible
  | "REVIEW"       // Too close to call — human review needed
  | "DENY_BOTH";   // Both accounts have serious problems

export type StrongerAccount = "PARTY_A" | "PARTY_B" | "EQUAL";

// ----------------------------------------------------------------
// Single-party statuses (v1 — unchanged)
// ----------------------------------------------------------------
export type SingleStatus =
  | "submitted"
  | "evidence"
  | "questioning"
  | "answering"
  | "judging"
  | "completed";

// ----------------------------------------------------------------
// Multi-party statuses (v2 — new)
// ----------------------------------------------------------------
export type MultiStatus =
  | "created"             // Party A created claim, not yet submitted Stage 1
  | "party_a_active"      // Party A submitted Stage 1, working through stages
  | "party_a_questioning" // AI generating questions for Party A
  | "party_a_answering"   // Party A answering questions
  | "party_a_complete"    // Party A done — waiting for Party B (7-day window starts)
  | "party_b_joined"      // Party B entered respondent code
  | "party_b_active"      // Party B submitted Stage 1
  | "party_b_questioning" // AI generating questions for Party B
  | "party_b_answering"   // Party B answering questions
  | "judging"             // Both parties done — comparative AI running
  | "completed"           // Verdict issued
  | "uncontested";        // 7 days elapsed, Party B never joined

export type ClaimStatus = SingleStatus | MultiStatus;

// ================================================================
// SCREEN TYPES
// ================================================================

export type Screen =
  // Shared entry points
  | "landing"
  | "claim_type"
  | "claim_mode"          // NEW — single or multi?

  // Single-party flow (v1 unchanged)
  | "incident_report"
  | "evidence"
  | "questions_loading"
  | "answers"
  | "verdict_loading"
  | "results"

  // Multi-party — Party A flow
  | "multi_incident"      // same form as incident_report, party="A"
  | "multi_evidence"      // same form as evidence, party="A"
  | "multi_questions_loading_a"
  | "multi_answers_a"
  | "share"               // NEW — Party A done, show respondent code + WhatsApp share
  | "waiting"             // NEW — Party A waiting for Party B to join and complete

  // Multi-party — Party B flow
  | "join"                // NEW — Party B enters respondent code
  | "join_preview"        // NEW — Party B sees claim preview before committing
  | "multi_incident_b"    // same form as incident_report, party="B"
  | "multi_evidence_b"    // same form as evidence, party="B"
  | "multi_questions_loading_b"
  | "multi_answers_b"

  // Shared outcome screens
  | "verdict_loading_multi"
  | "results_multi"       // NEW — comparative results screen
  | "results_uncontested" // NEW — uncontested results screen

  // Utilities
  | "claim_lookup";

// ================================================================
// VERDICT DATA INTERFACES
// ================================================================

// Single-party verdict (v1 unchanged)
export interface VerdictData {
  verdict: VerdictType;
  credibility_score: number;       // 0–100
  reasoning: string;
  flags: string[];
  recommendation: Recommendation;
}

// Multi-party comparative verdict (v2 new)
export interface ComparativeVerdictData {
  party_a_verdict: VerdictType;
  party_a_score:   number;         // 0–100
  party_b_verdict: VerdictType;
  party_b_score:   number;         // 0–100
  agreements:      string[];       // facts both accounts agree on
  contradictions:  string[];       // direct conflicts between accounts
  stronger_account: StrongerAccount;
  recommendation:  ComparativeRecommendation;
  reasoning:       string;
}

// ================================================================
// CLAIM DATA — mirrors v2 contract claim_data dict exactly
// ================================================================

export interface ClaimData {
  claim_id:        string;
  claim_mode:      ClaimMode;
  claim_type:      ClaimType;
  status:          ClaimStatus;
  created_at:      number;

  // Party A identity
  claimant_address: string;
  claimant_name:    string;

  // Party A Stage 1
  incident_report:   string;
  incident_date:     string;
  incident_location: string;
  estimated_value:   string;

  // Party A Stage 2
  evidence_description: string;
  third_party_involved: boolean;
  third_party_name:     string;

  // Party A Stage 3
  questions: string[];
  answers:   Record<string, string>;

  // Single-party verdict
  verdict?: VerdictData;

  // Multi-party fields
  respondent_code:    string;
  party_b_address:    string;
  party_b_name:       string;

  party_b_incident_report:   string;
  party_b_incident_date:     string;
  party_b_incident_location: string;
  party_b_estimated_value:   string;

  party_b_evidence_description: string;
  party_b_third_party_involved: boolean;
  party_b_third_party_name:     string;

  party_b_questions: string[];
  party_b_answers:   Record<string, string>;

  comparative_verdict?: ComparativeVerdictData;

  party_a_complete_seq: number;

  // Error field
  error?: string;
}

// Preview returned by get_claim_by_respondent_code
// Party B can see this before joining — no Party A submission data
export interface ClaimPreview {
  claim_id:          string;
  claim_type:        ClaimType | string;
  claim_mode:        ClaimMode;
  claimant_name:     string;
  incident_date:     string;
  incident_location: string;
  status:            ClaimStatus | string;
  party_b_address:   string;
  error?:            string;
}

// ================================================================
// STATS + RECENT CLAIMS
// ================================================================

export interface ClaimantStats {
  claims_submitted:    number;
  consistent_claims:   number;
  review_claims:       number;
  contradictory_claims:number;
  display_name:        string;
}

export interface RecentClaimEntry {
  claim_id:         string;
  claim_mode:       ClaimMode | string;
  claim_type:       ClaimType | string;
  claimant_name:    string;
  status:           ClaimStatus | string;
  verdict:          VerdictType | string;
  credibility_score:number;
  stronger_account: StrongerAccount | string;
}

// ================================================================
// CLAIM TYPE METADATA
// ================================================================

export interface ClaimTypeInfo {
  type:        ClaimType;
  icon:        string;
  label:       string;
  description: string;
}

export const CLAIM_TYPES: ClaimTypeInfo[] = [
  { type: "AUTO",      icon: "🚗", label: "Auto",      description: "Car accident, vehicle damage or theft"             },
  { type: "PROPERTY",  icon: "🏠", label: "Property",  description: "Home damage, burglary, fire or flood"              },
  { type: "TRAVEL",    icon: "✈️", label: "Travel",    description: "Lost luggage, flight cancellation, medical abroad"  },
  { type: "DEVICE",    icon: "💻", label: "Device",    description: "Phone, laptop or electronics damage or theft"       },
  { type: "LIABILITY", icon: "⚖️", label: "Liability", description: "Third-party injury or property damage claim"        },
  { type: "MEDICAL",   icon: "🏥", label: "Medical",   description: "Medical expenses or treatment cost claim"           },
];

// ================================================================
// STATUS DISPLAY METADATA
// ================================================================

export interface StatusInfo {
  label:     string;
  pillClass: string;
  action:    string;
  canResume: boolean;
}

// All statuses — single and multi — mapped to display info
export const STATUS_INFO: Record<string, StatusInfo> = {
  // Single-party (v1 unchanged)
  submitted:    { label: "Stage 1 — Incident Report",     pillClass: "submitted",   action: "Continue Claim",       canResume: true  },
  evidence:     { label: "Stage 2 — Evidence",            pillClass: "evidence",    action: "Continue Claim",       canResume: true  },
  questioning:  { label: "AI Generating Questions",       pillClass: "questioning", action: "Check Progress",       canResume: true  },
  answering:    { label: "Stage 3 — Your Answers",        pillClass: "answering",   action: "Answer Questions",     canResume: true  },
  judging:      { label: "AI Rendering Verdict",          pillClass: "judging",     action: "Check Progress",       canResume: true  },
  completed:    { label: "Verdict Issued",                pillClass: "completed",   action: "View Results",         canResume: false },

  // Multi-party
  created:              { label: "Starting Claim",                pillClass: "submitted",   action: "Continue",             canResume: true  },
  party_a_active:       { label: "Stage 1 — Incident Report",     pillClass: "submitted",   action: "Continue Claim",       canResume: true  },
  party_a_questioning:  { label: "AI Reading Your Account",       pillClass: "questioning", action: "Check Progress",       canResume: true  },
  party_a_answering:    { label: "Your Questions Are Ready",      pillClass: "answering",   action: "Answer Questions",     canResume: true  },
  party_a_complete:     { label: "Waiting for Other Party",       pillClass: "judging",     action: "Check Status",         canResume: true  },
  party_b_joined:       { label: "Other Party Joined",            pillClass: "submitted",   action: "Continue",             canResume: true  },
  party_b_active:       { label: "Other Party Submitting",        pillClass: "submitted",   action: "Check Status",         canResume: true  },
  party_b_questioning:  { label: "AI Reading Other Party",        pillClass: "questioning", action: "Check Progress",       canResume: true  },
  party_b_answering:    { label: "Other Party Answering",         pillClass: "answering",   action: "Check Status",         canResume: true  },
  uncontested:          { label: "Uncontested — No Response",     pillClass: "completed",   action: "View Results",         canResume: false },
};

// ================================================================
// VERDICT UX COPY — human-readable, plain language
// Used by ResultsScreen and ResultsMultiScreen
// ================================================================

export interface VerdictCopy {
  headline:    string;
  body:        string;
  whatItMeans: string;
  whatNext:    string;
}

export interface ScoreLabel {
  min:   number;
  max:   number;
  label: string;
}

export const SCORE_LABELS: ScoreLabel[] = [
  { min: 85, max: 100, label: "Highly consistent"         },
  { min: 70, max: 84,  label: "Consistent"                },
  { min: 55, max: 69,  label: "Some gaps"                 },
  { min: 40, max: 54,  label: "Notable inconsistencies"   },
  { min: 25, max: 39,  label: "Material contradictions"   },
  { min: 0,  max: 24,  label: "Severely contradictory"    },
];

export function getScoreLabel(score: number): string {
  const match = SCORE_LABELS.find((s) => score >= s.min && score <= s.max);
  return match ? match.label : "Inconclusive";
}

export const SINGLE_VERDICT_COPY: Record<VerdictType, VerdictCopy> = {
  CONSISTENT: {
    headline:    "Your account held.",
    body:        "The AI read your full submission across all four stages and found no material contradictions. Your timeline checks out. Your evidence aligns with what you described. Your answers didn't shift from your original account.",
    whatItMeans: "Your insurer receives a tamper-proof case file showing your claim was internally consistent before any human reviewed it. That's useful leverage.",
    whatNext:    "Share your Claim ID with your insurer as supporting documentation. This record cannot be altered.",
  },
  REVIEW: {
    headline:    "Your account has gaps.",
    body:        "Not contradictions — gaps. The AI found parts of your submission that don't fully connect. A date that needs clarifying. A value that needs context. An answer that didn't quite address the question asked.",
    whatItMeans: "A human adjuster should look at this before any decision is made. That's not a denial — it's a flag that something needs a closer look.",
    whatNext:    "You can still submit this Claim ID to your insurer. The reasoning below tells you exactly what the AI flagged. Address those points directly when you speak to your adjuster.",
  },
  CONTRADICTORY: {
    headline:    "Your account didn't hold.",
    body:        "The AI found statements across your submission that directly contradict each other. Not gaps — actual conflicts between what you said at different stages.",
    whatItMeans: "This doesn't determine your claim outcome. It means your submission, as it stands, has material inconsistencies that an adjuster will likely question.",
    whatNext:    "Review the flags below. If any reflect genuine errors in your submission rather than factual contradictions, speak to your insurer directly before submitting this record.",
  },
};

export const UNCONTESTED_COPY: VerdictCopy = {
  headline:    "The other party didn't respond.",
  body:        "You submitted your account. You answered the AI's questions. The other party had 7 days to submit their version and didn't.",
  whatItMeans: "Your account stands as the only on-chain record of this incident. It wasn't tested against a competing account — but it was tested against itself, and the score below reflects how well it held up.",
  whatNext:    "Share your Claim ID with your insurer. The record shows you submitted in good faith, independently, before any adjuster reviewed your claim.",
};

// Multi-party: copy for when accounts mostly align
export const MULTI_ALIGNED_COPY = {
  headline:    "Both accounts tell the same story in the places that matter.",
  body:        "The core facts — where it happened, when, what was involved — line up between both submissions. The AI found disagreements on detail but no direct conflicts on the material facts.",
  whatItMeans: "This is a straightforward dispute on specifics, not a case where one party is fabricating the incident itself.",
};

// Multi-party: copy for when accounts conflict materially
export const MULTI_CONFLICT_COPY = {
  headline:    "These two accounts cannot both be accurate.",
  body:        "The AI found direct contradictions between the submissions — not differences in interpretation, but statements that flatly contradict each other on facts both parties should agree on.",
  whatItMeans: "A human adjuster needs to determine which account is more credible. The scores reflect which submission held up better under its own internal cross-examination — not who is right, but whose story was more consistent with itself.",
};

// Credibility score explainer — shown once above both scores in multi-party
export const SCORE_EXPLAINER = "The credibility score doesn't measure honesty. It measures consistency. A high score means the account held together well across all four stages — the timeline, the evidence, and the answers all pointed in the same direction. A low score means something shifted between stages.";
