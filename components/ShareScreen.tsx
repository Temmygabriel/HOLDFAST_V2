"use client";
// HOLDFAST v2 — Share Screen
// Party A has completed all 4 stages.
// Primary action: share the Respondent Code with the other party.
// WhatsApp is the realistic sharing method in most markets.

import { useState } from "react";

interface Props {
  claimId:        string;
  respondentCode: string;
  onContinue:     () => void;
}

export default function ShareScreen({ claimId, respondentCode, onContinue }: Props) {
  const [codeCopied, setCodeCopied]   = useState(false);
  const [claimCopied, setClaimCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(respondentCode).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); })
      .catch(() => { const el = document.createElement("textarea"); el.value = respondentCode; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); });
  }

  function copyClaimId() {
    navigator.clipboard.writeText(claimId).then(() => { setClaimCopied(true); setTimeout(() => setClaimCopied(false), 2000); })
      .catch(() => { const el = document.createElement("textarea"); el.value = claimId; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); setClaimCopied(true); setTimeout(() => setClaimCopied(false), 2000); });
  }

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}?join=${respondentCode}`
    : `https://holdfast-verify.vercel.app?join=${respondentCode}`;

  const whatsappText = encodeURIComponent(
    `I've submitted my account of our incident to HOLDFAST, an on-chain claims verification system.\n\nYou're invited to submit your version independently — the AI reads both accounts separately, and neither of us can see the other's submission.\n\nUse this link to join: ${joinUrl}\n\nOr go to holdfast-verify.vercel.app and enter code: ${respondentCode}`
  );

  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  return (
    <div className="screen fadeIn">

      {/* Party A complete badge */}
      <div className="party-badge party-badge--a">✓ Your submission is complete</div>

      <h2 className="screen-title">Share with the Other Party</h2>
      <p className="screen-sub">
        Your account is locked on-chain. Now send the Respondent Code to the other party. They submit their account independently — they can't see yours, and you can't see theirs until the verdict is issued.
      </p>

      {/* Respondent code card — the visual centrepiece */}
      <div className="respondent-code-card">
        <div className="respondent-code-eyebrow">Respondent Code — Send This</div>
        <div className="respondent-code-value">{respondentCode}</div>
        <p className="respondent-code-desc">
          The other party enters this code on HOLDFAST to submit their account. It expires once they join.
        </p>

        {/* WhatsApp — primary share method */}
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="share-btn-whatsapp">
          <span style={{ fontSize: "18px" }}>💬</span>
          Share via WhatsApp
        </a>

        {/* Copy code fallback */}
        <button className="share-btn-copy" onClick={copyCode}>
          {codeCopied ? "Code Copied ✓" : "Copy Respondent Code"}
        </button>
      </div>

      {/* What the message says */}
      <div className="card--inset" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          What the WhatsApp message says
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, fontStyle: "italic" }}>
          "I've submitted my account of our incident to HOLDFAST, an on-chain claims verification system. You're invited to submit your version independently — the AI reads both accounts separately, and neither of us can see the other's submission."
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          This wording is deliberately neutral. It doesn't accuse. It frames the process as mutual.
        </p>
      </div>

      {/* What happens if they don't respond */}
      <div className="notice notice--warning">
        <span className="notice-icon">⏳</span>
        <span>
          The other party has <strong>7 days</strong> to respond. If they don't, you can finalise your claim as an uncontested record. Your account will still be scored for internal consistency.
        </span>
      </div>

      {/* Your own claim ID */}
      <div className="claim-id-banner">
        <div>
          <div className="claim-id-label">Your Claim ID</div>
          <div className="claim-id-value">{claimId}</div>
        </div>
        <button className="claim-id-copy" onClick={copyClaimId}>{claimCopied ? "Copied ✓" : "Copy"}</button>
      </div>

      <button className="btn-primary" onClick={onContinue}>
        Continue to Status Page →
      </button>

      <p className="hint-text">
        You can also close this tab now. Return with Claim ID <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{claimId}</strong> to check progress.
      </p>

    </div>
  );
}
