"use client";
// HOLDFAST v2 — Questions Loading Screen
// Used for single-party, multi Party A, and multi Party B.

import { useState } from "react";

interface Props {
  claimId:     string;
  partyLabel?: string; // "Your" for multi, undefined for single
}

export default function QuestionsLoading({ claimId, partyLabel = "" }: Props) {
  const [copied, setCopied] = useState(false);

  function copyClaimId() {
    navigator.clipboard.writeText(claimId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => { const el = document.createElement("textarea"); el.value = claimId; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="screen screen--centered fadeIn">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "100%", maxWidth: "420px" }}>

        <div className="ai-block slideUp">
          <div className="ai-block-icon">✦</div>
          <div className="ai-block-title">Reading Your Account</div>
          <p className="ai-block-sub">
            The AI adjuster is analysing your incident report and evidence. It's identifying gaps, vague language, and details that need clarifying before a verdict can be reached.
          </p>
          <div className="ai-dots"><span /><span /><span /></div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--violet)", opacity: 0.75, letterSpacing: "0.06em" }}>
            Generating {partyLabel ? partyLabel.toLowerCase() + " " : ""}questions — 1–3 minutes
          </p>
        </div>

        {/* Claim ID + close and come back */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-mid)", borderRadius: "var(--radius-lg)", padding: "20px", width: "100%", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>Your Claim ID</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-primary)" }}>{claimId}</div>
            <button className="claim-id-copy" onClick={copyClaimId}>{copied ? "Copied ✓" : "Copy"}</button>
          </div>
          <div style={{ height: "1px", background: "var(--border)" }} />
          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text-primary)" }}>You can close this tab.</strong> Traditional claims take weeks. Ours takes minutes. When the AI is done, your questions will be waiting.
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6 }}>
            Return to <strong style={{ color: "var(--text-primary)" }}>HOLDFAST</strong> → Look Up Claim → enter <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", color: "var(--text-primary)" }}>{claimId}</strong>.
          </p>
        </div>

        <div className="card--inset" style={{ width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>What happens next</div>
          {[
            ["✦", "The AI reads both stages of your submission"],
            ["💬", "4 questions are generated, specific to your account"],
            ["📋", "You answer them — stored permanently on-chain"],
            ["⚖️", "The AI analyses all 4 stages and renders a verdict"],
          ].map(([icon, text]) => (
            <div key={text as string} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              <span style={{ fontSize: "14px", flexShrink: 0, color: "var(--violet)", marginTop: "1px" }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div className="notice notice--neutral" style={{ width: "100%", textAlign: "left" }}>
          <span className="notice-icon">ℹ️</span>
          <span>This is a real AI on a decentralised network. The questions are specific to what you wrote — not a generic template. That specificity is why it takes a few minutes.</span>
        </div>

      </div>
    </div>
  );
}
