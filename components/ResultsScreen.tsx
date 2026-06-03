"use client";
// HOLDFAST v2 — Results Screen (Single Party)
// Plain-language verdict copy. Score label. PDF download. Full case record.

import { ClaimData, VerdictType, Recommendation, CLAIM_TYPES, SINGLE_VERDICT_COPY, getScoreLabel } from "../types";

interface Props {
  claim:            ClaimData;
  claimantAddress:  string;
  onNewClaim:       () => void;
  onHome:           () => void;
}

const VERDICT_COLORS: Record<VerdictType, string> = {
  CONSISTENT:    "var(--consistent)",
  REVIEW:        "var(--review)",
  CONTRADICTORY: "var(--deny)",
};

const REC_LABELS: Record<Recommendation, string> = {
  APPROVE: "Recommended for Approval",
  REVIEW:  "Referred for Human Review",
  DENY:    "Recommended for Denial",
};

const REC_ICONS: Record<Recommendation, string> = {
  APPROVE: "✓", REVIEW: "⚑", DENY: "✕",
};

function verdictVariant(v: VerdictType) {
  if (v === "CONSISTENT") return "consistent";
  if (v === "CONTRADICTORY") return "contradictory";
  return "review";
}

function scoreColor(score: number) {
  if (score >= 70) return "var(--consistent)";
  if (score >= 40) return "var(--review)";
  return "var(--deny)";
}

function downloadPdf(claim: ClaimData) {
  const verdict = claim.verdict;
  if (!verdict) return;
  const claimTypeInfo = CLAIM_TYPES.find((c) => c.type === claim.claim_type);
  const claimLabel    = claimTypeInfo ? claimTypeInfo.label : claim.claim_type;
  const copy          = SINGLE_VERDICT_COPY[verdict.verdict as VerdictType];

  const qaRows = (claim.questions ?? []).map((q, i) => {
    const a = claim.answers?.[String(i)] ?? "No answer recorded";
    return `<div class="qa"><div class="q">Q${i+1}: ${q}</div><div class="a">${a}</div></div>`;
  }).join("");

  const flagRows = (verdict.flags ?? []).length > 0
    ? verdict.flags.map(f => `<div class="flag">⚑ ${f}</div>`).join("")
    : "<div style='color:#888'>No inconsistencies flagged.</div>";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>HOLDFAST — Claim ${claim.claim_id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;font-size:13px;color:#1a1a2e;padding:48px 56px;line-height:1.65}
  .header{border-bottom:3px solid #0F2447;padding-bottom:20px;margin-bottom:28px}.brand{font-family:'Syne',sans-serif;font-size:2.2rem;font-weight:800;color:#0F2447}
  .sub{font-family:'JetBrains Mono',monospace;font-size:10px;color:#8a97b0;letter-spacing:.12em;text-transform:uppercase;margin-top:4px}
  .verdict-block{border-radius:10px;padding:20px 24px;margin:20px 0}
  .verdict-block.consistent{background:rgba(5,150,105,.06);border:1.5px solid rgba(5,150,105,.3)}
  .verdict-block.review{background:rgba(180,83,9,.06);border:1.5px solid rgba(180,83,9,.3)}
  .verdict-block.contradictory{background:rgba(220,38,38,.06);border:1.5px solid rgba(220,38,38,.3)}
  .verdict-word{font-family:'Syne',sans-serif;font-size:2.4rem;font-weight:800}
  .consistent .verdict-word{color:#059669}.review .verdict-word{color:#B45309}.contradictory .verdict-word{color:#DC2626}
  .verdict-headline{font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;margin-top:8px}
  .consistent .verdict-headline{color:#059669}.review .verdict-headline{color:#B45309}.contradictory .verdict-headline{color:#DC2626}
  .verdict-body{font-size:13px;color:#4a5568;line-height:1.75;margin-top:6px}
  .score{font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;margin-top:8px}
  .consistent .score{color:#059669}.review .score{color:#B45309}.contradictory .score{color:#DC2626}
  .rec{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-top:10px}
  .rec-approve{background:rgba(5,150,105,.1);color:#059669;border:1px solid rgba(5,150,105,.3)}
  .rec-review{background:rgba(180,83,9,.1);color:#B45309;border:1px solid rgba(180,83,9,.3)}
  .rec-deny{background:rgba(220,38,38,.1);color:#DC2626;border:1px solid rgba(220,38,38,.3)}
  .section{margin:24px 0 10px;font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8a97b0;border-bottom:1px solid #e8edf6;padding-bottom:6px}
  .reasoning{background:#f4f6fa;border-left:3px solid #0F2447;border-radius:4px;padding:14px 16px;font-size:13px;color:#4a5568;line-height:1.75}
  .what-it-means{background:#f4f6fa;border-radius:6px;padding:12px 14px;font-size:12.5px;color:#4a5568;line-height:1.65;margin-top:8px}
  .what-next{background:#e8f4ff;border-radius:6px;padding:12px 14px;font-size:12.5px;color:#1D4ED8;line-height:1.65;margin-top:6px}
  .flag{background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.2);border-radius:6px;padding:8px 12px;margin-bottom:6px;font-size:12.5px}
  .meta-row{display:flex;gap:32px;flex-wrap:wrap;margin:12px 0}
  .meta-item{display:flex;flex-direction:column;gap:2px}
  .meta-label{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a97b0}
  .meta-val{font-size:13px;font-weight:600;color:#0d1b35}
  .stage-block{background:#f4f6fa;border-radius:8px;padding:14px 16px;margin-bottom:10px}
  .stage-num{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a97b0;margin-bottom:6px}
  .qa{margin-bottom:14px}.q{font-weight:600;color:#0d1b35;margin-bottom:4px;font-size:12.5px}
  .a{color:#4a5568;padding-left:12px;border-left:2px solid #e8edf6;font-size:12.5px;line-height:1.65}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e8edf6;font-family:'JetBrains Mono',monospace;font-size:9px;color:#8a97b0;letter-spacing:.08em;text-transform:uppercase}
  @media print{body{padding:24px 32px}}
</style></head><body>
<div class="header"><div class="brand">HOLDFAST</div><div class="sub">On-Chain Insurance Claims Verification — Official Verdict Report</div></div>
<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
  <div><div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a97b0;margin-bottom:4px">Claim ID</div>
  <div style="font-family:'JetBrains Mono',monospace;font-size:1.4rem;font-weight:700;letter-spacing:.18em;color:#0d1b35">${claim.claim_id}</div></div>
  <div style="text-align:right"><div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a97b0;margin-bottom:4px">Filed By</div>
  <div style="font-weight:600;color:#0d1b35">${claim.claimant_name}</div></div>
</div>
<div class="verdict-block ${verdict.verdict.toLowerCase()}">
  <div class="verdict-word">${verdict.verdict}</div>
  <div class="verdict-headline">${copy?.headline ?? ""}</div>
  <div class="verdict-body">${copy?.body ?? ""}</div>
  <div class="score">${verdict.credibility_score}<span style="font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:400;color:#8a97b0">/100 — ${getScoreLabel(verdict.credibility_score)}</span></div>
  <span class="rec rec-${verdict.recommendation.toLowerCase()}">${REC_ICONS[verdict.recommendation as Recommendation]} ${REC_LABELS[verdict.recommendation as Recommendation] ?? verdict.recommendation}</span>
  ${copy ? `<div class="what-it-means"><strong>What this means:</strong> ${copy.whatItMeans}</div><div class="what-next"><strong>What happens next:</strong> ${copy.whatNext}</div>` : ""}
</div>
<div class="meta-row">
  <div class="meta-item"><div class="meta-label">Claim Type</div><div class="meta-val">${claimLabel}</div></div>
  <div class="meta-item"><div class="meta-label">Incident Date</div><div class="meta-val">${claim.incident_date || "—"}</div></div>
  <div class="meta-item"><div class="meta-label">Location</div><div class="meta-val">${claim.incident_location || "—"}</div></div>
  <div class="meta-item"><div class="meta-label">Estimated Value</div><div class="meta-val">${claim.estimated_value || "—"}</div></div>
</div>
<div class="section">AI Reasoning</div><div class="reasoning">${verdict.reasoning}</div>
<div class="section">Flags (${(verdict.flags ?? []).length})</div>${flagRows}
<div class="section">Stage 1 — Incident Report</div><div class="stage-block">${claim.incident_report}</div>
<div class="section">Stage 2 — Evidence</div><div class="stage-block">${claim.evidence_description}${claim.third_party_involved ? "<br/><br/><strong>Third Party:</strong> " + (claim.third_party_name || "Involved") : ""}</div>
<div class="section">Stage 3 — AI Questions &amp; Answers</div>${qaRows}
<div class="footer">HOLDFAST On-Chain Claims Verification &nbsp;·&nbsp; Claim ID: ${claim.claim_id} &nbsp;·&nbsp; This report reflects the AI verdict stored permanently on the GenLayer blockchain. It is not a final insurance decision.</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

export default function ResultsScreen({ claim, claimantAddress, onNewClaim, onHome }: Props) {
  const verdict  = claim.verdict;
  const hasVerdict = verdict && verdict.verdict;

  if (!hasVerdict) {
    return (
      <div className="screen screen--centered fadeIn">
        <div className="ai-block">
          <div className="ai-block-icon">⚖️</div>
          <div className="ai-block-title">Verdict Pending</div>
          <p className="ai-block-sub">The AI is still processing. Check back in a few minutes using your Claim ID.</p>
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

  const v        = verdict.verdict as VerdictType;
  const rec      = verdict.recommendation as Recommendation;
  const score    = verdict.credibility_score ?? 0;
  const variant  = verdictVariant(v);
  const copy     = SINGLE_VERDICT_COPY[v];
  const claimTypeInfo = CLAIM_TYPES.find((c) => c.type === claim.claim_type);

  return (
    <div className="screen fadeIn">

      <div className="claim-id-banner">
        <div><div className="claim-id-label">Claim ID — Permanent Record</div><div className="claim-id-value">{claim.claim_id}</div></div>
        <button className="claim-id-copy" onClick={() => navigator.clipboard.writeText(claim.claim_id)}>Copy</button>
      </div>

      {/* Verdict banner */}
      <div className={`verdict-banner verdict-banner--${variant} slideUp`}>
        <div className={`verdict-eyebrow verdict-eyebrow--${variant}`}>
          {claimTypeInfo?.label ?? claim.claim_type} · AI Verdict
        </div>
        <div className={`verdict-word verdict-word--${variant}`}>{v}</div>

        {/* Plain language copy */}
        <div className="verdict-copy-block">
          <div className={`verdict-copy-headline verdict-copy-headline--${variant}`}>{copy.headline}</div>
          <p className="verdict-copy-body">{copy.body}</p>
        </div>

        <div className={`recommendation-chip recommendation-chip--${rec.toLowerCase()}`}>
          <span>{REC_ICONS[rec]}</span>{REC_LABELS[rec]}
        </div>
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

      {/* What it means + what next */}
      <div className="verdict-copy-section">
        <div className="verdict-copy-section-label">What this means</div>
        <div className="verdict-copy-section-text">{copy.whatItMeans}</div>
      </div>
      <div className="verdict-copy-section">
        <div className="verdict-copy-section-label">What happens next</div>
        <div className="verdict-copy-section-text">{copy.whatNext}</div>
      </div>

      {/* AI Reasoning */}
      <div>
        <div className="section-label" style={{ marginBottom: "8px" }}>AI Reasoning</div>
        <div className="reasoning-block">{verdict.reasoning}</div>
      </div>

      {/* Flags */}
      {(verdict.flags ?? []).length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: "8px" }}>Inconsistencies Flagged ({verdict.flags.length})</div>
          <div className="flags-list">
            {verdict.flags.map((flag, i) => (
              <div key={i} className="flag-item"><span className="flag-icon">⚑</span><span>{flag}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* Full case record */}
      <div>
        <div className="section-label" style={{ marginBottom: "8px" }}>Full Case Record</div>
        <div className="stage-summary">

          <div className="stage-summary-row">
            <div className="stage-summary-header">
              <span className="stage-summary-num">Stage 1</span>
              <span className="stage-summary-title">Incident Report</span>
            </div>
            <div className="stage-summary-content">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: "8px", fontSize: "12px" }}>
                {[["Date", claim.incident_date], ["Location", claim.incident_location], ["Type", claimTypeInfo ? `${claimTypeInfo.icon} ${claimTypeInfo.label}` : claim.claim_type], ["Value", claim.estimated_value]].map(([label, val]) => (
                  <div key={label}>
                    <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
                    <div style={{ color: "var(--text-primary)", fontWeight: 500, marginTop: "2px" }}>{val || "—"}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65 }}>{claim.incident_report}</p>
            </div>
          </div>

          <div className="stage-summary-row">
            <div className="stage-summary-header">
              <span className="stage-summary-num">Stage 2</span>
              <span className="stage-summary-title">Evidence</span>
            </div>
            <div className="stage-summary-content">
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65 }}>{claim.evidence_description}</p>
              {claim.third_party_involved && (
                <div style={{ marginTop: "8px", fontSize: "12.5px", color: "var(--text-secondary)", display: "flex", gap: "6px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>Third Party:</span>
                  <span style={{ fontWeight: 500 }}>{claim.third_party_name || "Involved"}</span>
                </div>
              )}
            </div>
          </div>

          {(claim.questions ?? []).length > 0 && (
            <div className="stage-summary-row">
              <div className="stage-summary-header">
                <span className="stage-summary-num">Stage 3</span>
                <span className="stage-summary-title">AI Questions &amp; Your Answers</span>
              </div>
              <div className="stage-summary-content" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {claim.questions.map((q, i) => (
                  <div key={i}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--violet)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Q{i + 1}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.6, marginBottom: "6px" }}>{q}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, paddingLeft: "10px", borderLeft: "2px solid var(--border-mid)" }}>{claim.answers?.[String(i)] ?? "No answer recorded"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="notice notice--neutral">
        <span className="notice-icon">🔗</span>
        <span>This verdict is stored on-chain permanently under Claim ID <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{claim.claim_id}</strong>. Share it with your insurer for independent verification.</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button className="btn-secondary" onClick={() => downloadPdf(claim)} style={{ background: "var(--navy)", color: "#fff", border: "none" }}>
          ⬇ Download Verdict Report (PDF)
        </button>
        <button className="btn-primary" onClick={onNewClaim}>Submit Another Claim →</button>
        <button className="btn-outline" onClick={onHome}>← Back to Home</button>
      </div>

      <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", paddingBottom: "8px" }}>
        Filed by {claim.claimant_name} · HOLDFAST On-Chain Claims Verification
      </div>
    </div>
  );
}
