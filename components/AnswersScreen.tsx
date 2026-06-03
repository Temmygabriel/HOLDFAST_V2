"use client";
// HOLDFAST v2 — Answers Screen
// Works for Party A and Party B.
// Questions pulled from claim.questions (Party A) or claim.party_b_questions (Party B).

import { useState, useEffect } from "react";
import { ClaimData } from "../types";

interface Props {
  claimId:   string;
  claim:     ClaimData | null;
  party:     "A" | "B";
  onSubmit:  (answers: Record<string, string>) => void;
  loading:   string;
  error:     string;
  draftKey:  string;
}

export default function AnswersScreen({ claimId, claim, party, onSubmit, loading, error, draftKey }: Props) {
  const [answers, setAnswers]         = useState<Record<string, string>>({ "0": "", "1": "", "2": "", "3": "" });
  const [copied, setCopied]           = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const isLoading = !!loading;

  // Questions come from different fields depending on party
  const questions = party === "B"
    ? (claim?.party_b_questions ?? [])
    : (claim?.questions ?? []);

  useEffect(() => {
    const chainAnswers = party === "B" ? claim?.party_b_answers : claim?.answers;
    if (chainAnswers && Object.keys(chainAnswers).length === 4 && Object.values(chainAnswers).some((v) => v && v !== "No answer provided")) {
      setAnswers({ "0": chainAnswers["0"] ?? "", "1": chainAnswers["1"] ?? "", "2": chainAnswers["2"] ?? "", "3": chainAnswers["3"] ?? "" });
      return;
    }
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.claimId === claimId && parsed?.party === party && parsed?.answers) {
          setAnswers({ "0": parsed.answers["0"] ?? "", "1": parsed.answers["1"] ?? "", "2": parsed.answers["2"] ?? "", "3": parsed.answers["3"] ?? "" });
          setDraftRestored(true);
        }
      }
    } catch { /* corrupt draft — ignore */ }
  }, [claim, claimId, party, draftKey]);

  function updateAnswer(index: string, value: string) {
    const next = { ...answers, [index]: value };
    setAnswers(next);
    try { localStorage.setItem(draftKey, JSON.stringify({ claimId, party, answers: next })); } catch { /* silent */ }
  }

  function copyClaimId() {
    navigator.clipboard.writeText(claimId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => { const el = document.createElement("textarea"); el.value = claimId; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const allAnswered = [0, 1, 2, 3].every((i) => answers[String(i)].trim().length >= 10);

  if (questions.length === 0) {
    return (
      <div className="screen screen--centered fadeIn">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "var(--text-muted)", padding: "40px 0" }}>
          <span className="spinner spinner--violet" style={{ width: "20px", height: "20px" }} />
          <span style={{ fontSize: "14px" }}>Loading your questions...</span>
        </div>
      </div>
    );
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
        {["Incident", "Evidence", "Questions", "Answers", "Verdict"].map((name, i) => {
          const complete = i < 3; const active = i === 3;
          return (
            <div key={name} className={`stage-step ${complete ? "stage-step--complete" : ""}`}>
              <div className={`stage-dot ${complete ? "stage-dot--complete" : active ? "stage-dot--active" : ""}`}>{complete ? "✓" : i + 1}</div>
              <div className={`stage-name ${active ? "stage-name--active" : ""}`}>{name}</div>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="screen-title">Your Questions</h2>
        <p className="screen-sub" style={{ marginTop: "6px" }}>The AI read your account and generated these 4 questions. Answer each one specifically. Your answers are stored on-chain permanently.</p>
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "6px 12px", background: "var(--violet-light)", border: "1px solid var(--violet-border)", borderRadius: "var(--radius-pill)", width: "fit-content" }}>
        <span style={{ fontSize: "11px", color: "var(--violet)" }}>✦</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--violet)" }}>AI-Generated — Specific to Your Claim</span>
      </div>

      {draftRestored && (
        <div className="notice notice--info fadeIn">
          <span className="notice-icon">💾</span>
          <span>Your draft answers have been restored. Review them before submitting.</span>
        </div>
      )}

      {questions.map((question, i) => (
        <div key={i} className="question-card">
          <div className="question-number">Question {i + 1} of 4</div>
          <div className="question-text">{question}</div>
          <textarea className="question-answer-input" placeholder="Your answer..." value={answers[String(i)]} onChange={(e) => updateAnswer(String(i), e.target.value)} disabled={isLoading} maxLength={800} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11.5px", color: answers[String(i)].trim().length < 10 ? "var(--deny)" : "var(--consistent)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
              {answers[String(i)].trim().length < 10 ? `${answers[String(i)].trim().length}/10 min` : "✓"}
            </span>
            <span className="field-char-count">{answers[String(i)].length}/800</span>
          </div>
        </div>
      ))}

      <div className="notice notice--violet">
        <span className="notice-icon">✦</span>
        <div>
          <strong>After you submit:</strong> The AI analyses all four stages for consistency and renders a credibility verdict. This takes <strong>1–3 minutes</strong>.
          <br /><span style={{ marginTop: "6px", display: "block", opacity: 0.85 }}>You can close this tab. Return with Claim ID <strong style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{claimId}</strong>.</span>
        </div>
      </div>

      {error && <p className="error-text">⚠ {error}</p>}

      <button className="btn-primary" onClick={() => allAnswered && !isLoading && onSubmit(answers)} disabled={!allAnswered || isLoading}>
        {isLoading ? <span className="btn-loading"><span className="spinner" />{loading}</span> : "Submit All Answers →"}
      </button>

      {!allAnswered && !isLoading && (
        <p className="hint-text">Each answer needs at least 10 characters ({[0,1,2,3].filter((i) => answers[String(i)].trim().length < 10).length} remaining)</p>
      )}

      <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6, fontFamily: "var(--font-mono)", letterSpacing: "0.02em", paddingTop: "4px" }}>
        These answers are submitted on-chain and cannot be changed.
      </div>
    </div>
  );
}
