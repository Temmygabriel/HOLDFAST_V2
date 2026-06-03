"use client";
// HOLDFAST v2 — Claim Mode Screen
// Single question: does this involve another identifiable party?
// This determines the entire downstream flow.

import { ClaimMode, ClaimType, CLAIM_TYPES } from "../types";

interface Props {
  selectedType: ClaimType;
  onSelectMode: (mode: ClaimMode) => void;
  onBack:       () => void;
  loading:      string;
  error:        string;
}

// Which claim types default-suggest multi vs single
const MULTI_COMMON: ClaimType[] = ["AUTO", "LIABILITY"];
const EITHER: ClaimType[]       = ["PROPERTY"];

export default function ClaimModeScreen({ selectedType, onSelectMode, onBack, loading, error }: Props) {
  const isLoading    = !!loading;
  const claimInfo    = CLAIM_TYPES.find((c) => c.type === selectedType);
  const suggestMulti = MULTI_COMMON.includes(selectedType);
  const suggestEither= EITHER.includes(selectedType);

  return (
    <div className="screen fadeIn">
      <button className="back-btn" onClick={onBack} disabled={isLoading}>← Back</button>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "1.5rem" }}>{claimInfo?.icon}</span>
        <h2 className="screen-title">{claimInfo?.label} Claim</h2>
      </div>

      <p className="screen-sub">
        Does this claim involve another identifiable party who can be contacted?
      </p>

      {/* Suggestion banner */}
      {suggestMulti && (
        <div className="notice notice--violet">
          <span className="notice-icon">✦</span>
          <span>Most {claimInfo?.label.toLowerCase()} claims involve another party. If you know who the other driver or person is, choose <strong>Disputed Claim</strong> for a stronger on-chain record.</span>
        </div>
      )}
      {suggestEither && (
        <div className="notice notice--info">
          <span className="notice-icon">💡</span>
          <span>Property claims can go either way. Burglary by an unknown person? Choose Solo. Damage caused by a known neighbour or contractor? Choose Disputed.</span>
        </div>
      )}

      <div className="claim-mode-grid">

        {/* Solo / Single */}
        <button
          className="claim-mode-card claim-mode-card--single"
          onClick={() => !isLoading && onSelectMode("SINGLE")}
          disabled={isLoading}
        >
          <span className="claim-mode-icon">👤</span>
          <div className="claim-mode-title">Solo Claim</div>
          <div className="claim-mode-desc">
            No other identifiable party. The incident happened to you and the other party is unknown, absent, or not relevant.
          </div>
          <div className="claim-mode-examples">
            Medical · Device · Travel · Unknown theft
          </div>
        </button>

        {/* Disputed / Multi */}
        <button
          className="claim-mode-card claim-mode-card--multi"
          onClick={() => !isLoading && onSelectMode("MULTI")}
          disabled={isLoading}
        >
          <span className="claim-mode-icon">⚡</span>
          <div className="claim-mode-title">Disputed Claim</div>
          <div className="claim-mode-desc">
            Another identifiable party was involved and can be contacted. Both sides submit their accounts independently.
          </div>
          <div className="claim-mode-examples">
            Auto accidents · Liability · Known disputes
          </div>
        </button>

      </div>

      {/* What disputed means */}
      <div className="card--inset" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          How Disputed Claims work
        </div>
        {[
          ["You submit your account — the other party can't see it"],
          ["You share a 6-character Respondent Code with the other party"],
          ["They submit their account independently, without seeing yours"],
          ["The AI reads both accounts and produces a comparative analysis"],
          ["Neither party's full submission is ever visible to the other"],
        ].map(([text], i) => (
          <div key={i} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
            <span style={{ color: "var(--violet)", flexShrink: 0, marginTop: "1px" }}>✦</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "var(--text-muted)", justifyContent: "center" }}>
          <span className="spinner spinner--dark" />{loading}
        </div>
      )}
      {error && <p className="error-text">⚠ {error}</p>}
    </div>
  );
}
