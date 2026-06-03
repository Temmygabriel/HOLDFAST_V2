"use client";
// HOLDFAST v2 — Evidence Screen
// Works for Party A (SINGLE + MULTI) and Party B (MULTI).

import { useState } from "react";
import { ClaimType } from "../types";

interface Props {
  claimId:   string;
  claimType: ClaimType;
  party:     "A" | "B";
  onSubmit:  (evidence: string, thirdParty: boolean, thirdPartyName: string) => void;
  onBack:    () => void;
  loading:   string;
  error:     string;
}

const EVIDENCE_PLACEHOLDERS: Record<ClaimType, string> = {
  AUTO:      "Describe all evidence: police report number, photos of scene and vehicles, dashcam footage, witness contact details, repair estimates...",
  PROPERTY:  "Describe your evidence: photos of damage, receipts or valuations for affected items, inspection reports, CCTV or witness accounts, police report number...",
  TRAVEL:    "Describe your evidence: booking confirmation, boarding passes, carrier's written acknowledgement, receipts for additional expenses...",
  DEVICE:    "Describe your evidence: original receipt or proof of purchase, photos of damage, serial number or IMEI, repair quotes, police report if stolen...",
  LIABILITY: "Describe your evidence: photos of the scene, witness contact details, communications from the third party, police report, your insurance details...",
  MEDICAL:   "Describe your evidence: medical invoices and receipts, doctor's letters, prescription receipts, pre-authorisation from insurer, diagnostic reports...",
};

const STAGE_STEPS = ["Incident", "Evidence", "Questions", "Answers", "Verdict"];

export default function EvidenceScreen({ claimId, claimType, party, onSubmit, onBack, loading, error }: Props) {
  const [evidence, setEvidence]           = useState("");
  const [thirdParty, setThirdParty]       = useState<boolean | null>(null);
  const [thirdPartyName, setThirdPartyName] = useState("");
  const [copied, setCopied]               = useState(false);
  const isLoading = !!loading;

  const canSubmit = evidence.trim().length >= 30 && thirdParty !== null && (thirdParty === false || thirdPartyName.trim().length > 0);

  function copyClaimId() {
    navigator.clipboard.writeText(claimId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => { const el = document.createElement("textarea"); el.value = claimId; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="screen fadeIn">

      <div className="claim-id-banner">
        <div><div className="claim-id-label">Claim ID</div><div className="claim-id-value">{claimId}</div></div>
        <button className="claim-id-copy" onClick={copyClaimId}>{copied ? "Copied ✓" : "Copy"}</button>
      </div>

      {party === "B" && <div className="party-badge party-badge--b">⚡ Responding Party</div>}

      {/* Stage progress */}
      <div className="stage-progress">
        {STAGE_STEPS.map((name, i) => (
          <div key={name} className={`stage-step ${i < 1 ? "stage-step--complete" : ""}`}>
            <div className={`stage-dot ${i < 1 ? "stage-dot--complete" : i === 1 ? "stage-dot--active" : ""}`}>{i < 1 ? "✓" : i + 1}</div>
            <div className={`stage-name ${i === 1 ? "stage-name--active" : ""}`}>{name}</div>
          </div>
        ))}
      </div>

      <h2 className="screen-title">Supporting Evidence</h2>
      <p className="screen-sub">Stage 2 of 4. Describe the evidence you hold. You don't upload files — describe what exists and where.</p>

      <div className="field-group">
        <label className="field-label">Evidence Description <span className="field-label-required">*</span></label>
        <textarea placeholder={EVIDENCE_PLACEHOLDERS[claimType]} value={evidence} onChange={(e) => setEvidence(e.target.value)} disabled={isLoading} maxLength={1500} style={{ minHeight: "140px" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="field-hint">Be specific. "I have 12 photos taken at the scene immediately after" beats "I have photos."</span>
          <span className="field-char-count" style={{ color: evidence.length < 30 ? "var(--deny)" : "var(--text-muted)" }}>{evidence.length}/1500</span>
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">Third Party Involved? <span className="field-label-required">*</span></label>
        <div className="toggle-group">
          <button className={`toggle-btn ${thirdParty === true ? "toggle-btn--active" : ""}`} onClick={() => setThirdParty(true)} disabled={isLoading}>Yes</button>
          <button className={`toggle-btn ${thirdParty === false ? "toggle-btn--active" : ""}`} onClick={() => { setThirdParty(false); setThirdPartyName(""); }} disabled={isLoading}>No</button>
        </div>
      </div>

      {thirdParty === true && (
        <div className="field-group fadeIn">
          <label className="field-label">Third Party Name <span className="field-label-required">*</span></label>
          <input type="text" placeholder="Full name of the other party..." value={thirdPartyName} onChange={(e) => setThirdPartyName(e.target.value)} disabled={isLoading} maxLength={80} />
        </div>
      )}

      <div className="notice notice--violet">
        <span className="notice-icon">✦</span>
        <div>
          <strong>After you submit:</strong> The AI reads your full account and generates 4 targeted questions. This takes <strong>1–3 minutes</strong>.
          <br /><span style={{ marginTop: "6px", display: "block", opacity: 0.85 }}>You can close this tab. Return with Claim ID <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{claimId}</strong> to resume.</span>
        </div>
      </div>

      {error && <p className="error-text">⚠ {error}</p>}

      <button className="btn-primary" onClick={() => canSubmit && onSubmit(evidence.trim(), thirdParty === true, thirdPartyName.trim())} disabled={!canSubmit || isLoading}>
        {isLoading ? <span className="btn-loading"><span className="spinner" />{loading}</span> : "Submit Evidence & Get Questions →"}
      </button>

      {!canSubmit && !isLoading && (
        <p className="hint-text">{evidence.trim().length < 30 ? "Evidence description needs at least 30 characters" : thirdParty === null ? "Select whether a third party was involved" : "Enter the third party's name"}</p>
      )}

      <button className="back-btn" onClick={onBack} disabled={isLoading}>← Back to Incident Report</button>
    </div>
  );
}
