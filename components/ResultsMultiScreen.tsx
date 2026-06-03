"use client";
// HOLDFAST v2 — Results Multi Screen
// Comparative verdict. Two scores side by side.
// Plain language throughout — no jargon.
// Both parties see the same screen. Neither sees the other's raw submission.

import {
  ClaimData, VerdictType, ComparativeRecommendation, StrongerAccount,
  CLAIM_TYPES, getScoreLabel, SCORE_EXPLAINER,
  MULTI_ALIGNED_COPY, MULTI_CONFLICT_COPY
} from "../types";

interface Props {
  claim:       ClaimData;
  myAddress:   string;
  partyRole:   "A" | "B";
  onNewClaim:  () => void;
  onHome:      () => void;
}

const VERDICT_COLORS: Record<VerdictType, string> = {
  CONSISTENT:    "var(--consistent)",
  REVIEW:        "var(--review)",
  CONTRADICTORY: "var(--deny)",
};

const REC_COPY: Record<ComparativeRecommendation, { label: string; desc: string; color: string; bg: string; border: string }> = {
  APPROVE_A:  { label: "Party A's account is more credible",  desc: "The adjuster should weight Party A's submission more heavily.", color: "var(--blue)",      bg: "var(--blue-light)",      border: "var(--blue-border)"      },
  APPROVE_B:  { label: "Party B's account is more credible",  desc: "The adjuster should weight Party B's submission more heavily.", color: "var(--violet)",    bg: "var(--violet-light)",    border: "var(--violet-border)"    },
  REVIEW:     { label: "Referred for human review",           desc: "Both accounts have merit. A human adjuster needs to decide.",  color: "var(--review)",    bg: "var(--review-light)",    border: "var(--review-border)"    },
  DENY_BOTH:  { label: "Both accounts have serious issues",    desc: "Neither account held up well under cross-examination.",       color: "var(--deny)",      bg: "var(--deny-light)",      border: "var(--deny-border)"      },
};

function scoreColor(score: number) {
  if (score >= 70) return "var(--consistent)";
  if (score >= 40) return "var(--review)";
  return "var(--deny)";
}

function downloadPdf(claim: ClaimData) {
  const cv = claim.comparative_verdict;
  if (!cv) return;
  const claimTypeInfo = CLAIM_TYPES.find((c) => c.type === claim.claim_type);
  const rec = REC_COPY[cv.recommendation as ComparativeRecommendation];

  const agreementRows = (cv.agreements ?? []).map(a => `<div class="agree-row">✓ ${a}</div>`).join("");
  const conflictRows  = (cv.contradictions ?? []).map(c => `<div class="conflict-row">✕ ${c}</div>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>HOLDFAST — Claim ${claim.claim_id} — Comparative Verdict</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;font-size:13px;color:#1a1a2e;padding:48px 56px;line-height:1.65}
  .header{border-bottom:3px solid #0F2447;padding-bottom:20px;margin-bottom:28px}.brand{font-family:'Syne',sans-serif;font-size:2.2rem;font-weight:800;color:#0F2447}
  .sub{font-family:'JetBrains Mono',monospace;font-size:10px;color:#8a97b0;letter-spacing:.12em;text-transform:uppercase;margin-top:4px}
  .scores-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}
  .score-card{border-radius:10px;padding:18px 20px;border:1.5px solid #e8edf6;background:#f4f6fa}
  .score-card.stronger-a{border-color:#1D4ED8;background:rgba(29,78,216,.06)}
  .score-card.stronger-b{border-color:#6D28D9;background:rgba(109,40,217,.06)}
  .party-label{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
  .party-a .party-label{color:#1D4ED8}.party-b .party-label{color:#6D28D9}
  .party-name{font-size:14px;font-weight:600;color:#0d1b35;margin-top:4px}
  .verdict-chip{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.08em;margin-top:8px}
  .score-num{font-family:'Syne',sans-serif;font-size:2.2rem;font-weight:800;margin-top:4px}
  .score-label{font-size:11px;color:#8a97b0;font-family:'JetBrains Mono',monospace;letter-spacing:.04em}
  .section{margin:24px 0 10px;font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8a97b0;border-bottom:1px solid #e8edf6;padding-bottom:6px}
  .reasoning{background:#f4f6fa;border-left:3px solid #0F2447;border-radius:4px;padding:14px 16px;font-size:13px;color:#4a5568;line-height:1.75}
  .agree-row{background:rgba(5,150,105,.06);border:1px solid rgba(5,150,105,.2);border-radius:6px;padding:8px 12px;margin-bottom:6px;font-size:12.5px;color:#059669}
  .conflict-row{background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.2);border-radius:6px;padding:8px 12px;margin-bottom:6px;font-size:12.5px;color:#DC2626}
  .rec-block{border-radius:10px;padding:16px 20px;margin:16px 0}
  .explainer{background:#f4f6fa;border-radius:8px;padding:14px 16px;font-size:12.5px;color:#4a5568;line-height:1.7;font-style:italic;margin-top:12px}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e8edf6;font-family:'JetBrains Mono',monospace;font-size:9px;color:#8a97b0;letter-spacing:.08em;text-transform:uppercase}
  @media print{body{padding:24px 32px}}
</style></head><body>
<div class="header"><div class="brand">HOLDFAST</div><div class="sub">On-Chain Claims Verification — Comparative Verdict Report</div></div>
<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
  <div><div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a97b0;margin-bottom:4px">Claim ID</div>
  <div style="font-family:'JetBrains Mono',monospace;font-size:1.4rem;font-weight:700;letter-spacing:.18em;color:#0d1b35">${claim.claim_id}</div></div>
  <div style="text-align:right"><div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a97b0;margin-bottom:4px">Claim Type</div>
  <div style="font-weight:600;color:#0d1b35">${claimTypeInfo?.label ?? claim.claim_type}</div></div>
</div>
<div class="rec-block" style="background:${rec?.bg};border:1.5px solid ${rec?.border}">
  <div style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;color:${rec?.color}">${rec?.label ?? cv.recommendation}</div>
  <div style="font-size:13px;color:#4a5568;margin-top:6px">${rec?.desc ?? ""}</div>
</div>
<div class="scores-grid">
  <div class="score-card party-a ${cv.stronger_account === "PARTY_A" ? "stronger-a" : ""}">
    <div class="party-label">Party A ${cv.stronger_account === "PARTY_A" ? "· Stronger Account" : ""}</div>
    <div class="party-name">${claim.claimant_name}</div>
    <div class="verdict-chip" style="color:${VERDICT_COLORS[cv.party_a_verdict as VerdictType] ?? "#888"}">${cv.party_a_verdict}</div>
    <div class="score-num" style="color:${scoreColor(cv.party_a_score)}">${cv.party_a_score}</div>
    <div class="score-label">/100 — ${getScoreLabel(cv.party_a_score)}</div>
  </div>
  <div class="score-card party-b ${cv.stronger_account === "PARTY_B" ? "stronger-b" : ""}">
    <div class="party-label">Party B ${cv.stronger_account === "PARTY_B" ? "· Stronger Account" : ""}</div>
    <div class="party-name">${claim.party_b_name}</div>
    <div class="verdict-chip" style="color:${VERDICT_COLORS[cv.party_b_verdict as VerdictType] ?? "#888"}">${cv.party_b_verdict}</div>
    <div class="score-num" style="color:${scoreColor(cv.party_b_score)}">${cv.party_b_score}</div>
    <div class="score-label">/100 — ${getScoreLabel(cv.party_b_score)}</div>
  </div>
</div>
<div class="explainer">${SCORE_EXPLAINER}</div>
<div class="section">AI Reasoning</div><div class="reasoning">${cv.reasoning}</div>
<div class="section">Where Both Accounts Agree (${(cv.agreements ?? []).length})</div>${agreementRows || "<p style='color:#888'>No direct agreements identified.</p>"}
<div class="section">Direct Contradictions (${(cv.contradictions ?? []).length})</div>${conflictRows || "<p style='color:#888'>No direct contradictions identified.</p>"}
<div class="footer">HOLDFAST On-Chain Claims Verification &nbsp;·&nbsp; Claim ID: ${claim.claim_id} &nbsp;·&nbsp; Neither party's full submission is reproduced in this report. This is not a final insurance decision.</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

export default function ResultsMultiScreen({ claim, myAddress, partyRole, onNewClaim, onHome }: Props) {
  const cv = claim.comparative_verdict;

  if (!cv || !cv.party_a_verdict) {
    return (
      <div className="screen screen--centered fadeIn">
        <div className="ai-block">
          <div className="ai-block-icon">⚖️</div>
          <div className="ai-block-title">Verdict Pending</div>
          <p className="ai-block-sub">The AI is still processing. Check back in a few minutes.</p>
          <div className="ai-dots"><span /><span /><span /></div>
        </div>
        <div className="claim-id-banner">
          <div><div className="claim-id-label">Claim ID</div><div className="claim-id-value">{claim.claim_id}</div></div>
          <button className="claim-id-copy" onClick={() => navigator.clipboard.writeText(claim.claim_id)}>Copy</button>
        </div>
        <button className="btn-outline" onClick={onHome}>← Back to Home</button>
      </div>
    );
  }

  const stronger   = cv.stronger_account as StrongerAccount;
  const rec        = cv.recommendation as ComparativeRecommendation;
  const recInfo    = REC_COPY[rec];
  const claimTypeInfo = CLAIM_TYPES.find((c) => c.type === claim.claim_type);

  // Determine if accounts are broadly aligned or conflicting
  const hasConflicts = (cv.contradictions ?? []).length > 0;
  const contextCopy  = hasConflicts ? MULTI_CONFLICT_COPY : MULTI_ALIGNED_COPY;

  const isStrongerA = stronger === "PARTY_A";
  const isStrongerB = stronger === "PARTY_B";
  const myRole      = partyRole;
  const iAmStronger = (myRole === "A" && isStrongerA) || (myRole === "B" && isStrongerB);

  return (
    <div className="screen fadeIn">

      {/* Claim ID */}
      <div className="claim-id-banner">
        <div><div className="claim-id-label">Claim ID — Permanent Record</div><div className="claim-id-value">{claim.claim_id}</div></div>
        <button className="claim-id-copy" onClick={() => navigator.clipboard.writeText(claim.claim_id)}>Copy</button>
      </div>

      {/* My party badge */}
      <div className={`party-badge party-badge--${myRole.toLowerCase()}`}>
        {myRole === "A" ? "👤 You are Party A" : "⚡ You are Party B"}
      </div>

      {/* Context copy — aligned or conflicting */}
      <div style={{ background: hasConflicts ? "var(--deny-light)" : "var(--consistent-light)", border: `1px solid ${hasConflicts ? "var(--deny-border)" : "var(--consistent-border)"}`, borderRadius: "var(--radius-lg)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 800, color: hasConflicts ? "var(--deny)" : "var(--consistent)", letterSpacing: "-0.01em" }}>
          {contextCopy.headline}
        </div>
        <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.7 }}>{contextCopy.body}</p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, fontStyle: "italic" }}>{contextCopy.whatItMeans}</p>
      </div>

      {/* Recommendation */}
      <div style={{ background: recInfo?.bg, border: `1.5px solid ${recInfo?.border}`, borderRadius: "var(--radius-lg)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>Adjuster Recommendation</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 800, color: recInfo?.color }}>{recInfo?.label ?? rec}</div>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{recInfo?.desc}</div>
      </div>

      {/* Score explainer */}
      <div className="score-explainer-block">{SCORE_EXPLAINER}</div>

      {/* Two scores side by side */}
      <div>
        <div className="section-label" style={{ marginBottom: "10px" }}>Credibility Scores</div>
        <div className="comp-scores-grid">
          {/* Party A */}
          <div className={`comp-score-card ${isStrongerA ? "comp-score-card--stronger comp-score-card--stronger-a" : ""}`}>
            <div className="comp-score-party comp-score-party--a">
              Party A {myRole === "A" && <span style={{ opacity: 0.6 }}>(You)</span>}
            </div>
            <div className="comp-score-name">{claim.claimant_name}</div>
            <div className="comp-score-verdict" style={{ color: VERDICT_COLORS[cv.party_a_verdict as VerdictType] ?? "var(--text-muted)" }}>
              {cv.party_a_verdict}
            </div>
            <div className="comp-score-number" style={{ color: scoreColor(cv.party_a_score) }}>
              {cv.party_a_score}
              <span style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 400 }}>/100</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--text-muted)", letterSpacing: "0.04em" }}>{getScoreLabel(cv.party_a_score)}</div>
            {isStrongerA && <div className="stronger-badge stronger-badge--a">★ Stronger Account</div>}
          </div>

          {/* Party B */}
          <div className={`comp-score-card ${isStrongerB ? "comp-score-card--stronger comp-score-card--stronger-b" : ""}`}>
            <div className="comp-score-party comp-score-party--b">
              Party B {myRole === "B" && <span style={{ opacity: 0.6 }}>(You)</span>}
            </div>
            <div className="comp-score-name">{claim.party_b_name}</div>
            <div className="comp-score-verdict" style={{ color: VERDICT_COLORS[cv.party_b_verdict as VerdictType] ?? "var(--text-muted)" }}>
              {cv.party_b_verdict}
            </div>
            <div className="comp-score-number" style={{ color: scoreColor(cv.party_b_score) }}>
              {cv.party_b_score}
              <span style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 400 }}>/100</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--text-muted)", letterSpacing: "0.04em" }}>{getScoreLabel(cv.party_b_score)}</div>
            {isStrongerB && <div className="stronger-badge stronger-badge--b">★ Stronger Account</div>}
          </div>
        </div>
      </div>

      {/* Personal result note */}
      {iAmStronger ? (
        <div className="notice notice--info">
          <span className="notice-icon">✓</span>
          <span>Your account was assessed as more internally consistent. Share Claim ID <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{claim.claim_id}</strong> with your insurer.</span>
        </div>
      ) : stronger !== "EQUAL" ? (
        <div className="notice notice--warning">
          <span className="notice-icon">⚑</span>
          <span>The other party's account scored higher for internal consistency. Review the contradictions below — if any reflect genuine errors in your submission, address them directly with your adjuster.</span>
        </div>
      ) : null}

      {/* AI Reasoning */}
      <div>
        <div className="section-label" style={{ marginBottom: "8px" }}>AI Reasoning</div>
        <div className="reasoning-block">{cv.reasoning}</div>
      </div>

      {/* Agreements */}
      {(cv.agreements ?? []).length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: "8px" }}>Where Both Accounts Agree ({cv.agreements.length})</div>
          <div className="comp-list">
            {cv.agreements.map((a, i) => (
              <div key={i} className="comp-list-item comp-list-item--agree">
                <span className="comp-list-icon">✓</span><span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contradictions */}
      {(cv.contradictions ?? []).length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: "8px" }}>Direct Contradictions ({cv.contradictions.length})</div>
          <div className="comp-list">
            {cv.contradictions.map((c, i) => (
              <div key={i} className="comp-list-item comp-list-item--conflict">
                <span className="comp-list-icon">✕</span><span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy notice */}
      <div className="notice notice--neutral">
        <span className="notice-icon">🔒</span>
        <span>Neither party's full submission is visible here. Only this comparative analysis is shared. Both submissions are stored on-chain permanently under Claim ID <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{claim.claim_id}</strong>.</span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button className="btn-secondary" onClick={() => downloadPdf(claim)} style={{ background: "var(--navy)", color: "#fff", border: "none" }}>
          ⬇ Download Comparative Report (PDF)
        </button>
        <button className="btn-primary" onClick={onNewClaim}>Submit Another Claim →</button>
        <button className="btn-outline" onClick={onHome}>← Back to Home</button>
      </div>

      <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", paddingBottom: "8px" }}>
        {claim.claimant_name} vs {claim.party_b_name} · HOLDFAST On-Chain Claims Verification
      </div>

    </div>
  );
}
