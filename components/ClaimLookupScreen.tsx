"use client";
// HOLDFAST v2 — Claim Lookup Screen
// Works for both SINGLE and MULTI claims.
// Detects which party the current user is (by address match).
// Passes correct role to onRejoin.

import { useState } from "react";
import { ClaimData, STATUS_INFO, ClaimStatus, VerdictType, ClaimMode } from "../types";
import { getClaim } from "../lib/contract";

interface Props {
  claimantAddress: string;
  onRejoin:        (claim: ClaimData, role: "A" | "B") => void;
  onBack:          () => void;
}

type LookupState = "idle" | "loading" | "found" | "error";

const VERDICT_COLORS: Record<VerdictType, string> = {
  CONSISTENT:    "var(--consistent)",
  REVIEW:        "var(--review)",
  CONTRADICTORY: "var(--deny)",
};

export default function ClaimLookupScreen({ claimantAddress, onRejoin, onBack }: Props) {
  const [code, setCode]     = useState("");
  const [state, setState]   = useState<LookupState>("idle");
  const [claim, setClaim]   = useState<ClaimData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLookup() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) { setErrorMsg("Claim IDs are 6 characters"); return; }
    setState("loading"); setErrorMsg("");
    try {
      const data = await getClaim(trimmed);
      if (data.error) { setState("error"); setErrorMsg("Claim not found. Check the ID and try again."); return; }
      setClaim(data); setState("found");
    } catch {
      setState("error"); setErrorMsg("Could not reach the contract. Check your connection.");
    }
  }

  const statusInfo = claim ? STATUS_INFO[claim.status as ClaimStatus] ?? STATUS_INFO["completed"] : null;

  // Determine the user's role
  const isPartyA   = claim?.claimant_address === claimantAddress;
  const isPartyB   = claim?.party_b_address  === claimantAddress;
  const isOwner    = isPartyA || isPartyB;
  const myRole: "A" | "B" = isPartyB ? "B" : "A";

  const isMulti    = claim?.claim_mode === "MULTI";
  const isCompleted = claim?.status === "completed";
  const isUncontested = claim?.status === "uncontested";

  function handleRejoin() {
    if (!claim) return;
    onRejoin(claim, myRole);
  }

  return (
    <div className="screen fadeIn">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <h2 className="screen-title">Look Up a Claim</h2>
      <p className="screen-sub">Enter your 6-character Claim ID to check status, view results, or continue where you left off.</p>

      <div className="lookup-form">
        <input
          type="text"
          placeholder="Enter Claim ID — e.g. A3B7KX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          maxLength={6}
          autoCapitalize="characters"
          style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 700, letterSpacing: "0.18em", textAlign: "center" }}
        />
        <button className="btn-primary" onClick={handleLookup} disabled={state === "loading" || code.trim().length < 6}>
          {state === "loading"
            ? <span className="btn-loading"><span className="spinner" />Looking up...</span>
            : "Look Up Claim →"
          }
        </button>
      </div>

      {errorMsg && <p className="error-text">⚠ {errorMsg}</p>}

      {state === "found" && claim && statusInfo && (
        <div className="lookup-result slideUp">

          {/* Header */}
          <div className="lookup-result-header">
            <div className="lookup-result-id">{claim.claim_id}</div>
            <span className={`lookup-status-pill lookup-status-pill--${claim.status}`}>{statusInfo.label}</span>
          </div>

          {/* Claimant info */}
          <div className="lookup-meta">
            <strong style={{ color: "var(--text-primary)" }}>{claim.claimant_name}</strong>
            {isMulti && claim.party_b_name && <span> vs <strong style={{ color: "var(--text-primary)" }}>{claim.party_b_name}</strong></span>}
            {" · "}
            <span style={{ background: isMulti ? "var(--violet-light)" : "var(--blue-light)", color: isMulti ? "var(--violet)" : "var(--blue)", border: `1px solid ${isMulti ? "var(--violet-border)" : "var(--blue-border)"}`, padding: "2px 8px", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {isMulti ? "Disputed" : "Solo"} · {claim.claim_type}
            </span>
            {isOwner && (
              <span style={{ marginLeft: "6px", fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--blue)", background: "var(--blue-light)", border: "1px solid var(--blue-border)", padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>
                Your claim {myRole === "B" ? "(Party B)" : ""}
              </span>
            )}
          </div>

          {/* Single-party verdict summary */}
          {(isCompleted || isUncontested) && claim.verdict && !isMulti && (
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                {isUncontested ? "Uncontested Verdict" : "Verdict"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, color: VERDICT_COLORS[claim.verdict.verdict as VerdictType] ?? "var(--text-primary)" }}>
                  {claim.verdict.verdict}
                </span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 800, color: VERDICT_COLORS[claim.verdict.verdict as VerdictType] ?? "var(--text-primary)", marginLeft: "auto" }}>
                  {claim.verdict.credibility_score}<span style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 400 }}>/100</span>
                </span>
              </div>
              {claim.verdict.reasoning && (
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, fontStyle: "italic" }}>
                  {claim.verdict.reasoning.length > 180 ? claim.verdict.reasoning.slice(0, 180) + "…" : claim.verdict.reasoning}
                </p>
              )}
            </div>
          )}

          {/* Multi-party comparative summary */}
          {isCompleted && isMulti && claim.comparative_verdict && (
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>Comparative Verdict</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: `Party A — ${claim.claimant_name}`, verdict: claim.comparative_verdict.party_a_verdict, score: claim.comparative_verdict.party_a_score, stronger: claim.comparative_verdict.stronger_account === "PARTY_A" },
                  { label: `Party B — ${claim.party_b_name}`, verdict: claim.comparative_verdict.party_b_verdict, score: claim.comparative_verdict.party_b_score, stronger: claim.comparative_verdict.stronger_account === "PARTY_B" },
                ].map(({ label, verdict, score, stronger }) => (
                  <div key={label} style={{ background: stronger ? "var(--blue-light)" : "var(--surface)", border: `1px solid ${stronger ? "var(--blue-border)" : "var(--border)"}`, borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 800, color: VERDICT_COLORS[verdict as VerdictType] ?? "var(--text-muted)" }}>{verdict}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{score}/100</div>
                    {stronger && <div style={{ fontSize: "10px", color: "var(--blue)", fontWeight: 700, marginTop: "4px" }}>★ Stronger Account</div>}
                  </div>
                ))}
              </div>
              {claim.comparative_verdict.reasoning && (
                <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.65, fontStyle: "italic" }}>
                  {claim.comparative_verdict.reasoning.length > 180 ? claim.comparative_verdict.reasoning.slice(0, 180) + "…" : claim.comparative_verdict.reasoning}
                </p>
              )}
            </div>
          )}

          {/* In-progress status */}
          {!isCompleted && !isUncontested && (
            <div className="notice notice--neutral">
              <span className="notice-icon">{["party_a_questioning", "party_b_questioning", "questioning", "judging"].includes(claim.status) ? "✦" : "📋"}</span>
              <span style={{ fontSize: "13px" }}>
                {claim.status === "questioning"      && "The AI is generating your questions. This takes 1–3 minutes."}
                {claim.status === "answering"        && "Your questions are ready and waiting for your answers."}
                {claim.status === "judging"          && "The AI is rendering your verdict. This takes 1–3 minutes."}
                {claim.status === "submitted"        && "Stage 1 is incomplete. Resume to continue your incident report."}
                {claim.status === "evidence"         && "Stage 2 is incomplete. Resume to submit your evidence."}
                {claim.status === "party_a_complete" && "Waiting for the other party to respond. They have 7 days."}
                {claim.status === "party_b_joined"   && "The other party has joined and is submitting their account."}
                {claim.status === "party_a_questioning" && "The AI is generating questions for Party A."}
                {claim.status === "party_b_questioning" && "The AI is generating questions for Party B."}
                {claim.status === "party_a_answering"   && "Party A is answering their questions."}
                {claim.status === "party_b_answering"   && "Party B is answering their questions."}
              </span>
            </div>
          )}

          <button className={isCompleted || isUncontested ? "btn-secondary" : "btn-primary"} onClick={handleRejoin}
            style={isCompleted || isUncontested ? { background: "var(--navy)", color: "#fff", border: "none" } : {}}>
            {statusInfo.action} →
          </button>

        </div>
      )}

      <div className="notice notice--info">
        <span className="notice-icon">💡</span>
        <span>Claim records are stored on-chain permanently. Look up any claim from any device, at any time — no account or login required.</span>
      </div>

    </div>
  );
}
