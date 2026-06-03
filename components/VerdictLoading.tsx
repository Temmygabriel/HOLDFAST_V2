"use client";
// HOLDFAST v2 — Verdict Loading Screen
// isMulti: true shows comparative verdict description

import { useState } from "react";

interface Props {
  claimId: string;
  onHome:  () => void;
  isMulti?: boolean;
}

export default function VerdictLoading({ claimId, onHome, isMulti = false }: Props) {
  const [copied, setCopied] = useState(false);

  function copyClaimId() {
    navigator.clipboard.writeText(claimId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => { const el = document.createElement("textarea"); el.value = claimId; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="screen screen--centered fadeIn">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "100%", maxWidth: "420px" }}>

        <div className="ai-block slideUp">
          <div className="ai-block-icon">⚖️</div>
          <div className="ai-block-title">Rendering Verdict</div>
          <p className="ai-block-sub">
            {isMulti
              ? "The AI is reading both parties' full submissions — incident reports, evidence, and every answer — and testing them for internal consistency and direct contradictions."
              : "The AI is reading all four stages of your claim and testing them for internal consistency."}
          </p>
          <div className="ai-dots"><span /><span /><span /></div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--violet)", opacity: 0.75, letterSpacing: "0.06em" }}>
            {isMulti ? "Comparing accounts — 1–3 minutes" : "Analysing consistency — 1–3 minutes"}
          </p>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border-mid)", borderRadius: "var(--radius-lg)", padding: "20px", width: "100%", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>Your Claim ID</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-primary)" }}>{claimId}</div>
            <button className="claim-id-copy" onClick={copyClaimId}>{copied ? "Copied ✓" : "Copy"}</button>
          </div>
          <div style={{ height: "1px", background: "var(--border)" }} />
          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text-primary)" }}>Your part is done.</strong> You can close this tab. The verdict will be stored on-chain the moment it's ready.
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6 }}>
            Return to <strong style={{ color: "var(--text-primary)" }}>HOLDFAST</strong> → Look Up Claim → enter <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "var(--text-primary)" }}>{claimId}</strong>.
          </p>
        </div>

        {/* What AI checks */}
        <div className="card--inset" style={{ width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            {isMulti ? "What the AI is comparing" : "What the AI is checking"}
          </div>
          {(isMulti ? [
            ["🔍", "Where both accounts agree on material facts"],
            ["⚡", "Direct contradictions between the two submissions"],
            ["📅", "Timeline consistency within each account"],
            ["💰", "Whether claimed values align with the incident described"],
            ["🗣️", "Which account held up better under cross-examination"],
          ] : [
            ["🔍", "Direct contradictions between your report and answers"],
            ["📅", "Timeline plausibility and date consistency"],
            ["💰", "Whether the estimated value is credible for this claim type"],
            ["🗣️", "Evasive, vague, or shifting language across stages"],
            ["📋", "Whether your evidence aligns with what you described"],
          ]).map(([icon, text]) => (
            <div key={text as string} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Possible verdicts */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px 20px", width: "100%", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>Possible Verdicts</div>
          {[
            { v: "CONSISTENT",    color: "var(--consistent)", bg: "var(--consistent-light)", border: "var(--consistent-border)", desc: "Account is internally coherent across all stages. No material contradictions." },
            { v: "REVIEW",        color: "var(--review)",     bg: "var(--review-light)",     border: "var(--review-border)",     desc: "Some gaps or inconsistencies detected. Warrants human adjuster review." },
            { v: "CONTRADICTORY", color: "var(--deny)",       bg: "var(--deny-light)",       border: "var(--deny-border)",       desc: "Statements materially contradict each other across stages." },
          ].map(({ v, color, bg, border, desc }) => (
            <div key={v} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "var(--radius-md)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color }}>{v}</span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{desc}</span>
            </div>
          ))}
        </div>

        <button className="btn-outline" onClick={onHome} style={{ width: "100%" }}>← Back to Home</button>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.6 }}>
          Going home won't affect your claim. Use Look Up Claim with ID <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{claimId}</strong> to retrieve your verdict.
        </p>

      </div>
    </div>
  );
}
