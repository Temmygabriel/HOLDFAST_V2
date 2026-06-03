"use client";
// HOLDFAST v2 — Incident Report Screen
// Works for Party A (SINGLE and MULTI) and Party B (MULTI).
// Party badge shown for multi-party claims.

import { useState } from "react";
import { ClaimType } from "../types";

interface Props {
  claimId:    string;
  claimType:  ClaimType;
  party:      "A" | "B";
  onSubmit:   (report: string, date: string, location: string, value: string) => void;
  onBack:     () => void;
  loading:    string;
  error:      string;
}

const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  AUTO: "Auto Claim", PROPERTY: "Property Claim", TRAVEL: "Travel Claim",
  DEVICE: "Device Claim", LIABILITY: "Liability Claim", MEDICAL: "Medical Claim",
};

const REPORT_PLACEHOLDERS: Record<ClaimType, string> = {
  AUTO:      "Describe the accident: what happened, sequence of events, other vehicle(s), road and weather conditions, what you did immediately after...",
  PROPERTY:  "Describe the incident: what happened to the property, when you discovered the damage, extent of damage, what caused it...",
  TRAVEL:    "Describe the travel disruption: what happened, which journey was affected, what the carrier told you, expenses incurred...",
  DEVICE:    "Describe what happened to the device: how damage or theft occurred, where you were, when you first noticed it missing or damaged...",
  LIABILITY: "Describe the incident: how the third party was injured or their property damaged, your role, where it happened, what followed...",
  MEDICAL:   "Describe your medical situation: condition requiring treatment, when symptoms appeared, what treatment you received, providers involved...",
};

const STAGE_STEPS = ["Incident", "Evidence", "Questions", "Answers", "Verdict"];

export default function IncidentScreen({ claimId, claimType, party, onSubmit, onBack, loading, error }: Props) {
  const [report, setReport]       = useState("");
  const [date, setDate]           = useState("");
  const [location, setLocation]   = useState("");
  const [value, setValue]         = useState("");
  const [currency, setCurrency]   = useState("USD");
  const [copied, setCopied]       = useState(false);
  const isLoading = !!loading;

  const canSubmit = report.trim().length >= 50 && date.trim() && location.trim() && value.trim();

  function copyClaimId() {
    navigator.clipboard.writeText(claimId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => { const el = document.createElement("textarea"); el.value = claimId; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(report.trim(), date.trim(), location.trim(), currency + " " + value.trim());
  }

  return (
    <div className="screen fadeIn">

      {/* Claim ID banner */}
      <div className="claim-id-banner">
        <div>
          <div className="claim-id-label">Claim ID — Save This</div>
          <div className="claim-id-value">{claimId}</div>
        </div>
        <button className="claim-id-copy" onClick={copyClaimId}>{copied ? "Copied ✓" : "Copy"}</button>
      </div>

      {/* Party badge for multi */}
      {party === "B" && (
        <div className="party-badge party-badge--b">⚡ You are the responding party</div>
      )}

      {/* Stage progress */}
      <div className="stage-progress">
        {STAGE_STEPS.map((name, i) => (
          <div key={name} className={`stage-step ${i < 0 ? "stage-step--complete" : ""}`}>
            <div className={`stage-dot ${i === 0 ? "stage-dot--active" : ""}`}>{i + 1}</div>
            <div className={`stage-name ${i === 0 ? "stage-name--active" : ""}`}>{name}</div>
          </div>
        ))}
      </div>

      <h2 className="screen-title">Incident Report</h2>
      <p className="screen-sub">
        {CLAIM_TYPE_LABELS[claimType]} · Stage 1 of 4.
        {party === "B" ? " Describe the incident from your perspective. Your account is completely independent." : " Describe exactly what happened. Be specific."}
      </p>

      {/* Date + Location */}
      <div className="fields-row">
        <div className="field-group">
          <label className="field-label">Incident Date <span className="field-label-required">*</span></label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isLoading} max={new Date().toISOString().split("T")[0]} />
        </div>
        <div className="field-group">
          <label className="field-label">Location <span className="field-label-required">*</span></label>
          <input type="text" placeholder="City, address or description..." value={location} onChange={(e) => setLocation(e.target.value)} disabled={isLoading} maxLength={120} />
        </div>
      </div>

      {/* Estimated value with currency dropdown */}
      <div className="field-group">
        <label className="field-label">Estimated Claim Value <span className="field-label-required">*</span></label>
        <div style={{ display: "flex", gap: "8px" }}>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={isLoading}
            style={{ width: "auto", flexShrink: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "14px", background: "var(--surface-2)", border: "1.5px solid var(--border-mid)", borderRadius: "var(--radius-md)", padding: "10px 12px", color: "var(--text-primary)", cursor: "pointer", appearance: "auto" }}>
            <option value="USD">$ USD</option>
            <option value="GBP">£ GBP</option>
            <option value="EUR">€ EUR</option>
            <option value="NGN">₦ NGN</option>
          </select>
          <input type="number" placeholder="0.00" value={value} onChange={(e) => setValue(e.target.value)} disabled={isLoading} min="0" style={{ flex: 1, margin: 0 }} />
        </div>
        <span className="field-hint">This figure will be tested for plausibility by the AI.</span>
      </div>

      {/* Report textarea */}
      <div className="field-group">
        <label className="field-label">Incident Description <span className="field-label-required">*</span></label>
        <textarea placeholder={REPORT_PLACEHOLDERS[claimType]} value={report} onChange={(e) => setReport(e.target.value)} disabled={isLoading} maxLength={2000} style={{ minHeight: "160px" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="field-hint">Minimum 50 characters.</span>
          <span className="field-char-count" style={{ color: report.length < 50 ? "var(--deny)" : "var(--text-muted)" }}>{report.length}/2000</span>
        </div>
      </div>

      <div className="notice notice--warning">
        <span className="notice-icon">⚠️</span>
        <span>This account is submitted under attestation. The AI will cross-reference your description against your evidence and answers.</span>
      </div>

      {error && <p className="error-text">⚠ {error}</p>}

      <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit || isLoading}>
        {isLoading ? <span className="btn-loading"><span className="spinner" />{loading}</span> : "Save Incident Report →"}
      </button>

      {!canSubmit && !isLoading && (
        <p className="hint-text">{report.trim().length < 50 ? `${report.trim().length}/50 characters minimum` : "Complete all fields to continue"}</p>
      )}
    </div>
  );
}
