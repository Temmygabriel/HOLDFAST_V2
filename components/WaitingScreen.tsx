"use client";
// HOLDFAST v2 — Waiting Screen
// Party A has completed everything and is waiting for Party B.
// Shows a clear status dashboard, not a spinner.
// After 7 days Party A can finalise as uncontested.

import { ClaimData } from "../types";

interface Props {
  claimId:   string;
  claim:     ClaimData | null;
  partyATs:  number;   // timestamp when Party A completed (from localStorage)
  onFinalise:() => void;
  onRefresh: () => void;
  onHome:    () => void;
  loading:   string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function WaitingScreen({ claimId, claim, partyATs, onFinalise, onRefresh, onHome, loading }: Props) {
  const isLoading    = !!loading;
  const status       = claim?.status ?? "party_a_complete";
  const partyBJoined = !["party_a_complete"].includes(status);
  const partyBDone   = ["judging", "completed", "uncontested"].includes(status);

  const elapsed      = partyATs ? Date.now() - partyATs : 0;
  const daysElapsed  = Math.floor(elapsed / (24 * 60 * 60 * 1000));
  const daysLeft     = Math.max(0, 7 - daysElapsed);
  const canFinalise  = elapsed > SEVEN_DAYS_MS && status === "party_a_complete";

  // Status labels for each row
  const rows = [
    {
      label:  "Your submission",
      done:   true,
      detail: "All 4 stages complete and locked on-chain",
      icon:   "✓",
    },
    {
      label:  "Other party joined",
      done:   partyBJoined,
      detail: partyBJoined ? "They have entered the Respondent Code" : "Waiting for them to enter the code",
      icon:   partyBJoined ? "✓" : "○",
    },
    {
      label:  "Other party submitted",
      done:   partyBDone,
      detail: partyBDone ? "Their account is locked on-chain" : partyBJoined ? "They are working through their stages" : "Waiting",
      icon:   partyBDone ? "✓" : "○",
    },
    {
      label:  "AI comparative verdict",
      done:   status === "completed",
      detail: status === "completed" ? "Verdict issued" : status === "judging" ? "AI is analysing both accounts now" : "Pending both submissions",
      icon:   status === "completed" ? "✓" : status === "judging" ? "✦" : "○",
      isAi:  true,
    },
  ];

  return (
    <div className="screen fadeIn">

      <div className="party-badge party-badge--a">✓ Your submission is locked</div>

      <h2 className="screen-title">Waiting for the Other Party</h2>
      <p className="screen-sub">
        Your account is on-chain and cannot be changed. The other party has been sent the Respondent Code. This page shows their progress.
      </p>

      {/* Status dashboard */}
      <div className="waiting-status-card">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Claim Status
        </div>
        {rows.map((row) => (
          <div key={row.label} className="waiting-status-row">
            <div className={`waiting-status-icon ${row.done ? "waiting-status-icon--done" : row.isAi && status === "judging" ? "waiting-status-icon--waiting" : "waiting-status-icon--pending"}`}>
              {row.isAi && status === "judging"
                ? <span className="spinner spinner--violet" style={{ width: "14px", height: "14px" }} />
                : <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700 }}>{row.icon}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div className="waiting-status-label">{row.label}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{row.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 7-day countdown — only show if Party B hasn't joined yet */}
      {!partyBJoined && partyATs > 0 && (
        <div className="countdown-strip">
          <span className="countdown-strip-icon">⏳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>
              {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining` : "Time window expired"}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "2px" }}>
              {daysLeft > 0
                ? "If the other party doesn't respond in time, you can finalise as an uncontested record."
                : "The other party didn't respond. You can now finalise your claim as an uncontested record."}
            </div>
          </div>
          {daysLeft > 0 && (
            <div style={{ textAlign: "right" }}>
              <div className="countdown-days">{daysLeft}</div>
              <div style={{ fontSize: "10px", color: "var(--review)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>DAYS LEFT</div>
            </div>
          )}
        </div>
      )}

      {/* Claim ID */}
      <div className="claim-id-banner">
        <div><div className="claim-id-label">Claim ID</div><div className="claim-id-value">{claimId}</div></div>
        <button className="claim-id-copy" onClick={() => { navigator.clipboard.writeText(claimId); }}>Copy</button>
      </div>

      {/* Finalise button — only after 7 days */}
      {canFinalise && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className="notice notice--warning">
            <span className="notice-icon">⚑</span>
            <span>7 days have passed with no response. You can finalise this claim now. Your account will be scored on its own and marked as uncontested.</span>
          </div>
          <button className="btn-primary" onClick={onFinalise} disabled={isLoading}>
            {isLoading ? <span className="btn-loading"><span className="spinner" />{loading}</span> : "Finalise as Uncontested Record →"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button className="btn-secondary" onClick={onRefresh} disabled={isLoading} style={{ flex: 1 }}>
          Refresh Status
        </button>
        <button className="btn-outline" onClick={onHome} disabled={isLoading} style={{ flex: 1 }}>
          ← Home
        </button>
      </div>

      <p className="hint-text">You can close this tab. Return with your Claim ID to check progress at any time.</p>

    </div>
  );
}
