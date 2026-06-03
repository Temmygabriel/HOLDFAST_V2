"use client";
// HOLDFAST v2 — Claim Type Screen (unchanged from v1)

import { useState } from "react";
import { ClaimType, CLAIM_TYPES } from "../types";

interface Props {
  onSelectType: (type: ClaimType) => void;
  onBack:       () => void;
  loading:      string;
  error:        string;
}

export default function ClaimTypeScreen({ onSelectType, onBack, loading, error }: Props) {
  const [hovered, setHovered] = useState<ClaimType | null>(null);
  const isLoading = !!loading;

  return (
    <div className="screen fadeIn">
      <button className="back-btn" onClick={onBack} disabled={isLoading}>← Back</button>
      <h2 className="screen-title">What type of claim?</h2>
      <p className="screen-sub">Select the category that best fits your incident.</p>

      <div className="claim-type-grid">
        {CLAIM_TYPES.map((ct) => (
          <button
            key={ct.type}
            className={`claim-type-card ${hovered === ct.type ? "claim-type-card--selected" : ""}`}
            onClick={() => !isLoading && onSelectType(ct.type)}
            onMouseEnter={() => setHovered(ct.type)}
            onMouseLeave={() => setHovered(null)}
            disabled={isLoading}
          >
            <span className="claim-type-icon">{ct.icon}</span>
            <div className="claim-type-name">{ct.label}</div>
            <div className="claim-type-desc">{ct.description}</div>
          </button>
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
