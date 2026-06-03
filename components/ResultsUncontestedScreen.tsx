"use client";
// HOLDFAST v2 — Results Uncontested Screen
// Party B never responded within 7 days.
// Party A's account was scored on its own merits.
// Tone: honest about what happened, not punishing to either party.

import { ClaimData, VerdictType, Recommendation, CLAIM_TYPES, UNCONTESTED_COPY, getScoreLabel } from "../types";

interface Props {
  claim:      ClaimData;
  onNewClaim: () => void;
  onHome:     () => void;
}

const VERDICT_COLORS: Record<VerdictType, string> = {
  CONSISTENT: "var(--consistent)", REVIEW: "var(--review)", CONTRADICTORY: "var(--deny)",
};

function scoreColor(score: number) {
  if (score >= 70) return "var(--consistent)";
  if (score >= 40) return "var(--review)";
  return "var(--deny)";
}

function verdictVariant(v: VerdictType) {
  if (v === "CONSISTENT") return "consistent";
  if (v === "CONTRADICTORY") return "contradictory";
  return "review";
}

export default function ResultsUncontestedScreen({ claim, onNewClaim, onHome }: Props) {
  const verdict = claim.verdict;
  if (!verdict || !verdict.verdict) {
    return (
      <div className="screen screen--centered fadeIn">
        <div className="ai-block">
          <div className="ai-block-icon">⚖️</div>
          <div className="ai-block-title">Processing</div>
          <p className="ai-block-sub">Finalising your uncontested record. Check back in a few minutes.</p>
          <div className="ai-dots"><span /><span /><span /></div>
        </div>
        <button className="btn-outline" onClick={onHome}>← Back to Home</button>
      </div>
    );
  }

  const v       = verdict.verdict as VerdictType;
  const score   = verdict.credibility_score ?? 0;
  const variant = verdictVariant(v);
  const claimTypeInfo = CLAIM_TYPES.find((c) => c.type === claim.claim_type);

  return (
    <div className="screen fadeIn">

      <div className="claim-id-banner">
        <div><div className="claim-id-label">Claim ID — Permanent Record</div><div className="claim-id-value">{claim.claim_id}</div></div>
        <button className="claim-id-copy" onClick={() => navigator.clipboard.writeText(claim.claim_id)}>Copy</button>
      </div>

      {/* Uncontested banner */}
      <div className="uncontested-banner">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          {claimTypeInfo?.label ?? claim.claim_type} · Uncontested Record
        </div>
        <div className="uncontested-title">{UNCONTESTED_COPY.headline}</div>
        <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.7 }}>{UNCONTESTED_COPY.body}</p>
      </div>

      {/* Verdict */}
      <div className={`verdict-banner verdict-banner--${variant}`}>
        <div className={`verdict-eyebrow verdict-eyebrow--${variant}`}>Your Account — AI Assessment</div>
        <div className={`verdict-word verdict-word--${variant}`}>{v}</div>
        <p className="verdict-tagline" style={{ fontStyle: "normal", fontSize: "13.5px" }}>
          {v === "CONSISTENT"
            ? "Your account held together across all four stages."
            : v === "REVIEW"
            ? "Your account has some gaps. An adjuster should review before any decision."
            : "Your account has material inconsistencies the AI flagged."}
        </p>
      </div>

      {/* Score */}
      <div className="score-container">
        <div className="score-label">Credibility Score</div>
        <div className="score-row">
          <div className="score-number" style={{ color: scoreColor(score) }}>
            {score}<span style={{ fontFamily: "var(--font-body)", fontSize: "1rem", color: "var(--text-muted)", fontWeight: 400, marginLeft: "4px" }}>/100</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            <div className="score-bar-track">
              <div className={`score-bar-fill score-bar-fill--${variant}`} style={{ width: `${score}%` }} />
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.04em" }}>{getScoreLabel(score)}</div>
          </div>
        </div>
      </div>

      {/* What it means */}
      <div className="verdict-copy-section">
        <div className="verdict-copy-section-label">What this means</div>
        <div className="verdict-copy-section-text">{UNCONTESTED_COPY.whatItMeans}</div>
      </div>

      {/* What next */}
      <div className="verdict-copy-section">
        <div className="verdict-copy-section-label">What happens next</div>
        <div className="verdict-copy-section-text">{UNCONTESTED_COPY.whatNext}</div>
      </div>

      {/* AI Reasoning */}
      <div>
        <div className="section-label" style={{ marginBottom: "8px" }}>AI Reasoning</div>
        <div className="reasoning-block">{verdict.reasoning}</div>
      </div>

      {/* Flags */}
      {(verdict.flags ?? []).length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: "8px" }}>Flags ({verdict.flags.length})</div>
          <div className="flags-list">
            {verdict.flags.map((flag, i) => (
              <div key={i} className="flag-item"><span className="flag-icon">⚑</span><span>{flag}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* No-response note */}
      <div className="notice notice--neutral">
        <span className="notice-icon">⏳</span>
        <span>The other party did not submit a response within 7 days. Their silence is part of the record. Your submission stands as the only on-chain account of this incident.</span>
      </div>

      <div className="notice notice--neutral">
        <span className="notice-icon">🔗</span>
        <span>This verdict is stored permanently under Claim ID <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{claim.claim_id}</strong>. Share it with your insurer for independent verification.</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button className="btn-primary" onClick={onNewClaim}>Submit Another Claim →</button>
        <button className="btn-outline" onClick={onHome}>← Back to Home</button>
      </div>

      <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", paddingBottom: "8px" }}>
        Filed by {claim.claimant_name} · HOLDFAST — Uncontested Record
      </div>

    </div>
  );
}
