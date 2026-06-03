"use client";
// HOLDFAST v2 — Join Screen
// Party B's entry point. They arrive via a link or with a code.
// Tone is neutral — not accusatory, not a trap.
// Explains what the process is before asking for anything.

import { useState } from "react";

interface Props {
  onJoin:  (code: string, name: string) => void;
  onBack:  () => void;
  loading: string;
  error:   string;
}

export default function JoinScreen({ onJoin, onBack, loading, error }: Props) {
  const [code, setCode]   = useState("");
  const [name, setName]   = useState("");
  const isLoading = !!loading;

  const canJoin = code.trim().length === 6 && name.trim().length >= 2;

  return (
    <div className="screen fadeIn">

      <button className="back-btn" onClick={onBack} disabled={isLoading}>← Back</button>

      {/* What this is — explained plainly before asking for anything */}
      <div className="join-hero">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.75rem" }}>⚡</span>
          <div className="join-hero-title">You've been invited to respond</div>
        </div>
        <div className="join-hero-body">
          Someone involved in an incident with you has submitted their account to HOLDFAST. You're being invited to submit yours.
        </div>
        <div className="join-hero-body">
          Your submission is completely independent. You won't see their account and they won't see yours — only the AI reads both, and only the comparative analysis is shared with either party.
        </div>
      </div>

      {/* How it works for Party B */}
      <div className="card--inset" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          What you'll do
        </div>
        {[
          ["📋", "Describe the incident from your perspective"],
          ["🗂️", "Describe any evidence you have"],
          ["✦",  "Answer 4 AI-generated questions specific to your account"],
          ["⚖️", "Receive a comparative analysis — where both accounts agree and where they differ"],
        ].map(([icon, text]) => (
          <div key={text as string} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
            <span style={{ flexShrink: 0, marginTop: "1px", color: "var(--violet)" }}>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      {/* Decline note — visible and honest */}
      <div className="notice notice--neutral">
        <span className="notice-icon">💡</span>
        <span>
          You don't have to submit. If you choose not to, the other party's submission will remain on-chain as an uncontested record after 7 days. Your silence becomes part of the record.
        </span>
      </div>

      {/* The form */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="field-group">
          <label className="field-label">Your Name <span className="field-label-required">*</span></label>
          <input
            type="text"
            placeholder="Full name for claim records..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            maxLength={40}
          />
        </div>

        <div className="field-group">
          <label className="field-label">Respondent Code <span className="field-label-required">*</span></label>
          <input
            type="text"
            placeholder="6-character code — e.g. A3B7KX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && canJoin && onJoin(code, name.trim())}
            disabled={isLoading}
            maxLength={6}
            autoCapitalize="characters"
            style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 700, letterSpacing: "0.18em", textAlign: "center" }}
          />
          <span className="field-hint">This was sent to you by the other party. It's different from a Claim ID.</span>
        </div>
      </div>

      {error && <p className="error-text">⚠ {error}</p>}

      <button
        className="btn-primary"
        onClick={() => canJoin && onJoin(code.trim(), name.trim())}
        disabled={!canJoin || isLoading}
        style={{ background: "var(--violet)", boxShadow: "var(--shadow-violet)" }}
      >
        {isLoading
          ? <span className="btn-loading"><span className="spinner" />{loading}</span>
          : "Join Claim & Submit My Account →"
        }
      </button>

      {!canJoin && !isLoading && (
        <p className="hint-text">
          {name.trim().length < 2 ? "Enter your name to continue" : "Enter the 6-character Respondent Code"}
        </p>
      )}

    </div>
  );
}
