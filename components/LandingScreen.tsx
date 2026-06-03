"use client";
// HOLDFAST v2 — Landing Screen
// Three entry points: Start Claim, Join a Claim (Party B), Look Up Claim

import { useState } from "react";

interface LandingProps {
  onStartClaim:  (name: string) => void;
  onLookupClaim: () => void;
  onJoinClaim:   () => void;
  loading:       string;
  error:         string;
  savedName:     string;
}

export default function LandingScreen({
  onStartClaim,
  onLookupClaim,
  onJoinClaim,
  loading,
  error,
  savedName,
}: LandingProps) {
  const [name, setName]           = useState(savedName || "");
  const [nameLocked, setNameLocked] = useState(!!savedName);
  const isLoading = !!loading;

  function lockName() { if (name.trim()) setNameLocked(true); }

  return (
    <div className="fadeIn">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="hero-section">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            On-Chain Claims Verification — v2
          </div>
          <h1 className="hero-wordmark">
            HOLD<span className="holdfast-accent">FAST</span>
          </h1>
          <p className="hero-tagline">
            Submit your claim. We hold it to the truth.<br />
            Single-party verification. Multi-party dispute resolution.<br />
            AI reads every account. The chain remembers every verdict.
          </p>
          <div className="process-steps">
            <div className="process-step">📋 Report</div>
            <span className="process-arrow">→</span>
            <div className="process-step">🗂️ Evidence</div>
            <span className="process-arrow">→</span>
            <div className="process-step process-step--ai">✦ AI Questions</div>
            <span className="process-arrow">→</span>
            <div className="process-step process-step--ai">⚖️ Verdict</div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="landing-body">
        <div className="landing-body-inner">

          {/* Name */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>
            Your Name
          </div>
          <div className="name-input-row">
            <input
              type="text"
              placeholder="Full name for claim records..."
              value={name}
              onChange={(e) => { setName(e.target.value); setNameLocked(false); }}
              onKeyDown={(e) => e.key === "Enter" && lockName()}
              disabled={nameLocked || isLoading}
              maxLength={40}
            />
            {nameLocked
              ? <button className="set-btn set-btn--confirmed" onClick={() => setNameLocked(false)}>✓ Edit</button>
              : <button className="set-btn" onClick={lockName} disabled={!name.trim()}>Confirm →</button>
            }
          </div>
          {nameLocked && <div className="name-confirm">✓ Filing as <strong>{name}</strong></div>}

          {/* Primary CTA */}
          <button className="btn-primary" onClick={() => onStartClaim(name.trim())} disabled={isLoading || !name.trim()} style={{ marginTop: "4px" }}>
            {loading === "Opening case file..." ? <span className="btn-loading"><span className="spinner" />Opening...</span> : "Submit a Claim →"}
          </button>

          {/* Join a Claim — Party B entry */}
          <button
            className="btn-secondary"
            onClick={onJoinClaim}
            disabled={isLoading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <span style={{ color: "var(--violet)", fontSize: "16px" }}>⚡</span>
            Join a Disputed Claim
          </button>

          {/* Lookup */}
          <button className="btn-outline" onClick={onLookupClaim} disabled={isLoading}>
            🔍 Look Up an Existing Claim
          </button>

          {error && <p className="error-text">⚠ {error}</p>}

          {/* Two modes explained */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
            <div style={{ background: "var(--blue-light)", border: "1px solid var(--blue-border)", borderRadius: "var(--radius-lg)", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--blue)" }}>Solo Claim</div>
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.55 }}>Medical bills, device theft, travel disruption. One party, one account, one verdict.</div>
            </div>
            <div style={{ background: "var(--violet-light)", border: "1px solid var(--violet-border)", borderRadius: "var(--radius-lg)", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--violet)" }}>Disputed Claim</div>
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.55 }}>Car accidents, liability, property disputes. Both parties submit independently. AI compares.</div>
            </div>
          </div>

          {/* How it works */}
          <div className="how-it-works" style={{ marginTop: "4px" }}>
            <div className="how-it-works-title">How HOLDFAST works</div>
            {[
              ["📋", "Stage 1", "Describe what happened — date, location, estimated value."],
              ["🗂️", "Stage 2", "Describe your supporting evidence and any third parties."],
              ["✦",  "AI reads your account", "Generates 4 targeted questions specific to what you wrote."],
              ["💬", "Stage 3", "Answer the questions. Stored on-chain permanently."],
              ["⚖️", "AI renders verdict", "Analyses all four stages. Issues a credibility score and verdict."],
              ["🔗", "On-chain forever", "Your Claim ID retrieves the full case file at any time."],
            ].map(([icon, title, desc]) => (
              <div key={title as string} className="how-it-works-step">
                <span className="how-it-works-step-icon">{icon}</span>
                <div>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px" }}>{title} — </span>
                  <span style={{ fontSize: "13px" }}>{desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="notice notice--info">
            <span className="notice-icon">💡</span>
            <span>You'll get a <strong>6-character Claim ID</strong> immediately after selecting your claim type. Save it — you can resume from any device with no login.</span>
          </div>

        </div>
      </div>
    </div>
  );
}
