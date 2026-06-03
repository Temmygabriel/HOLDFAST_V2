"use client";
// HOLDFAST v2 — Main Orchestrator
// Handles both SINGLE and MULTI party claim flows.
// Single: 2 AI calls — generate_questions, calculate_verdict
// Multi:  3 AI calls — generate_questions_a, generate_questions_b,
//                      calculate_comparative_verdict
// Each AI call has its own mutex ref. Status changes reset all mutexes.
// Party identity tracked via partyRole ("A" | "B" | null).

import { useState, useEffect, useRef, useCallback } from "react";
import { Screen, ClaimData, ClaimType, ClaimMode } from "../types";
import {
  makeAccount,
  createClaim,
  joinClaim,
  submitIncidentReport,
  submitEvidence,
  generateQuestions,
  generateQuestionsA,
  generateQuestionsB,
  submitAnswers,
  calculateVerdict,
  calculateComparativeVerdict,
  finaliseUncontested,
  getClaim,
} from "../lib/contract";

import LandingScreen          from "../components/LandingScreen";
import ClaimTypeScreen        from "../components/ClaimTypeScreen";
import ClaimModeScreen        from "../components/ClaimModeScreen";
import IncidentScreen         from "../components/IncidentScreen";
import EvidenceScreen         from "../components/EvidenceScreen";
import QuestionsLoading       from "../components/QuestionsLoading";
import AnswersScreen          from "../components/AnswersScreen";
import VerdictLoading         from "../components/VerdictLoading";
import ResultsScreen          from "../components/ResultsScreen";
import ShareScreen            from "../components/ShareScreen";
import WaitingScreen          from "../components/WaitingScreen";
import JoinScreen             from "../components/JoinScreen";
import ResultsMultiScreen     from "../components/ResultsMultiScreen";
import ResultsUncontestedScreen from "../components/ResultsUncontestedScreen";
import ClaimLookupScreen      from "../components/ClaimLookupScreen";

// ── Constants ────────────────────────────────────────────────────
const POLL_INTERVAL    = 3_000;
const AI_FALLBACK_MS   = 60_000;
const SEVEN_DAYS_SEQ   = 10000; // approx seq units — frontend uses Date for display
const LS_DRAFT_KEY     = "holdfast_v2_draft";
const LS_NAME_KEY      = "holdfast_v2_name";
const LS_KEY_KEY       = "holdfast_v2_privkey";
const LS_ADDR_KEY      = "holdfast_v2_address";
const LS_CLAIM_KEY     = "holdfast_v2_claim_id";
const LS_ROLE_KEY      = "holdfast_v2_role";
const LS_PARTY_A_TS    = "holdfast_v2_party_a_ts"; // timestamp when Party A completed

export default function App() {
  const [screen, setScreen]               = useState<Screen>("landing");
  const [claim, setClaim]                 = useState<ClaimData | null>(null);
  const [claimId, setClaimId]             = useState("");
  const [respondentCode, setRespondentCode] = useState("");
  const [claimantName, setClaimantName]   = useState("");
  const [selectedType, setSelectedType]   = useState<ClaimType>("AUTO");
  const [selectedMode, setSelectedMode]   = useState<ClaimMode>("SINGLE");
  const [partyRole, setPartyRole]         = useState<"A" | "B" | null>(null);
  const [error, setError]                 = useState("");
  const [loading, setLoading]             = useState("");

  // Stable refs
  const accountRef           = useRef<ReturnType<typeof makeAccount> | null>(null);
  const addressRef           = useRef<string>("");
  const screenRef            = useRef<Screen>("landing");
  const pollIdRef            = useRef<string>("");
  const pollTimerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const roleRef              = useRef<"A" | "B" | null>(null);
  const lastStatusRef        = useRef<string>("");

  // AI call mutex refs — one per AI call
  const genQRef              = useRef(false); // generate_questions (SINGLE)
  const genQaRef             = useRef(false); // generate_questions_a (MULTI)
  const genQbRef             = useRef(false); // generate_questions_b (MULTI)
  const calcVRef             = useRef(false); // calculate_verdict (SINGLE)
  const calcCVRef            = useRef(false); // calculate_comparative_verdict (MULTI)

  // Timestamp refs for 60s fallback
  const tsQuestioningRef     = useRef(0);
  const tsPartyAQRef         = useRef(0);
  const tsPartyBQRef         = useRef(0);
  const tsJudgingRef         = useRef(0);

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    const savedName = localStorage.getItem(LS_NAME_KEY);
    const savedKey  = localStorage.getItem(LS_KEY_KEY);
    const savedRole = localStorage.getItem(LS_ROLE_KEY) as "A" | "B" | null;

    let acc: ReturnType<typeof makeAccount>;
    try {
      if (savedKey && savedKey.startsWith("0x")) {
        acc = makeAccount(savedKey as `0x${string}`);
      } else {
        localStorage.removeItem(LS_KEY_KEY);
        acc = makeAccount();
        localStorage.setItem(LS_KEY_KEY, acc.privateKey);
      }
    } catch {
      localStorage.removeItem(LS_KEY_KEY);
      acc = makeAccount();
      localStorage.setItem(LS_KEY_KEY, acc.privateKey);
    }

    accountRef.current = acc;
    addressRef.current = acc.address;
    localStorage.setItem(LS_ADDR_KEY, acc.address);
    if (savedName) setClaimantName(savedName);
    if (savedRole) { setPartyRole(savedRole); roleRef.current = savedRole; }
  }, []);

  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => { roleRef.current = partyRole; }, [partyRole]);

  function getAccount() {
    if (!accountRef.current) {
      const savedKey = localStorage.getItem(LS_KEY_KEY);
      try {
        if (savedKey && savedKey.startsWith("0x")) {
          accountRef.current = makeAccount(savedKey as `0x${string}`);
        } else {
          accountRef.current = makeAccount();
          localStorage.setItem(LS_KEY_KEY, accountRef.current.privateKey);
        }
      } catch {
        accountRef.current = makeAccount();
        localStorage.setItem(LS_KEY_KEY, accountRef.current.privateKey);
      }
      addressRef.current = accountRef.current.address;
    }
    return accountRef.current;
  }

  // ── Polling ───────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  const startPolling = useCallback((cid: string) => {
    stopPolling();
    pollIdRef.current = cid;

    const activeScreens: Screen[] = [
      "questions_loading", "verdict_loading",
      "multi_questions_loading_a", "multi_questions_loading_b",
      "verdict_loading_multi", "waiting",
    ];

    const poll = async () => {
      if (!pollIdRef.current) return;
      if (!activeScreens.includes(screenRef.current)) return;

      try {
        const data: ClaimData = await getClaim(pollIdRef.current);
        if (!data || data.error) return;
        setClaim(data);

        // Reset all mutexes on any status change
        if (lastStatusRef.current !== data.status) {
          lastStatusRef.current = data.status;
          genQRef.current = genQaRef.current = genQbRef.current = false;
          calcVRef.current = calcCVRef.current = false;
          tsQuestioningRef.current = tsPartyAQRef.current = 0;
          tsPartyBQRef.current = tsJudgingRef.current = 0;
        }

        const acc  = getAccount();
        const mode = data.claim_mode;
        const role = roleRef.current;

        // ── SINGLE party routing ────────────────────────────────
        if (mode === "SINGLE") {
          if (data.status === "questioning") {
            setScreen("questions_loading");
            if (!genQRef.current) {
              if (!tsQuestioningRef.current) tsQuestioningRef.current = Date.now();
              if (Date.now() - tsQuestioningRef.current === 0 || Date.now() - tsQuestioningRef.current > AI_FALLBACK_MS) {
                genQRef.current = true;
                try { await generateQuestions(acc, pollIdRef.current); }
                catch { genQRef.current = false; }
              }
            }
          } else if (data.status === "answering") {
            stopPolling();
            setScreen("answers");
          } else if (data.status === "judging") {
            setScreen("verdict_loading");
            if (!calcVRef.current) {
              if (!tsJudgingRef.current) tsJudgingRef.current = Date.now();
              if (Date.now() - tsJudgingRef.current === 0 || Date.now() - tsJudgingRef.current > AI_FALLBACK_MS) {
                calcVRef.current = true;
                try { await calculateVerdict(acc, pollIdRef.current); }
                catch { calcVRef.current = false; }
              }
            }
          } else if (data.status === "completed") {
            stopPolling(); setScreen("results");
          }
          return;
        }

        // ── MULTI party routing ─────────────────────────────────
        if (mode === "MULTI") {

          // Party A flows
          if (role === "A") {
            if (data.status === "party_a_questioning") {
              setScreen("multi_questions_loading_a");
              if (!genQaRef.current) {
                if (!tsPartyAQRef.current) tsPartyAQRef.current = Date.now();
                if (Date.now() - tsPartyAQRef.current === 0 || Date.now() - tsPartyAQRef.current > AI_FALLBACK_MS) {
                  genQaRef.current = true;
                  try { await generateQuestionsA(acc, pollIdRef.current); }
                  catch { genQaRef.current = false; }
                }
              }
            } else if (data.status === "party_a_answering") {
              stopPolling(); setScreen("multi_answers_a");
            } else if (data.status === "party_a_complete") {
              stopPolling(); setScreen("waiting");
            } else if (data.status === "judging") {
              setScreen("verdict_loading_multi");
              // Party A also triggers comparative verdict if still judging
              if (!calcCVRef.current) {
                if (!tsJudgingRef.current) tsJudgingRef.current = Date.now();
                if (Date.now() - tsJudgingRef.current > AI_FALLBACK_MS) {
                  calcCVRef.current = true;
                  try { await calculateComparativeVerdict(acc, pollIdRef.current); }
                  catch { calcCVRef.current = false; }
                }
              }
            } else if (data.status === "completed") {
              stopPolling(); setScreen("results_multi");
            } else if (data.status === "uncontested") {
              stopPolling(); setScreen("results_uncontested");
            }
            return;
          }

          // Party B flows
          if (role === "B") {
            if (data.status === "party_b_questioning") {
              setScreen("multi_questions_loading_b");
              if (!genQbRef.current) {
                if (!tsPartyBQRef.current) tsPartyBQRef.current = Date.now();
                if (Date.now() - tsPartyBQRef.current === 0 || Date.now() - tsPartyBQRef.current > AI_FALLBACK_MS) {
                  genQbRef.current = true;
                  try { await generateQuestionsB(acc, pollIdRef.current); }
                  catch { genQbRef.current = false; }
                }
              }
            } else if (data.status === "party_b_answering") {
              stopPolling(); setScreen("multi_answers_b");
            } else if (data.status === "judging") {
              setScreen("verdict_loading_multi");
              // Party B triggers comparative verdict as primary caller
              if (!calcCVRef.current) {
                if (!tsJudgingRef.current) tsJudgingRef.current = Date.now();
                if (Date.now() - tsJudgingRef.current === 0 || Date.now() - tsJudgingRef.current > AI_FALLBACK_MS) {
                  calcCVRef.current = true;
                  try { await calculateComparativeVerdict(acc, pollIdRef.current); }
                  catch { calcCVRef.current = false; }
                }
              }
            } else if (data.status === "completed") {
              stopPolling(); setScreen("results_multi");
            }
            return;
          }
        }
      } catch { /* network blip — silent */ }
    };

    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  function resetState() {
    genQRef.current = genQaRef.current = genQbRef.current = false;
    calcVRef.current = calcCVRef.current = false;
    tsQuestioningRef.current = tsPartyAQRef.current = 0;
    tsPartyBQRef.current = tsJudgingRef.current = 0;
    lastStatusRef.current = "";
  }

  // ── Handlers ──────────────────────────────────────────────────

  function handleStartClaim(name: string) {
    localStorage.setItem(LS_NAME_KEY, name.trim());
    setClaimantName(name.trim());
    setError("");
    setScreen("claim_type");
  }

  function handleSelectType(type: ClaimType) {
    setSelectedType(type);
    setScreen("claim_mode");
  }

  async function handleSelectMode(mode: ClaimMode) {
    setSelectedMode(mode);
    setLoading("Opening case file...");
    setError("");
    const acc = getAccount();
    try {
      const { claimId: cid, respondentCode: rc } = await createClaim(acc, claimantName, selectedType, mode);
      setClaimId(cid);
      setRespondentCode(rc);
      setPartyRole("A");
      roleRef.current = "A";
      localStorage.setItem(LS_CLAIM_KEY, cid);
      localStorage.setItem(LS_ROLE_KEY, "A");
      resetState();
      setScreen(mode === "SINGLE" ? "incident_report" : "multi_incident");
    } catch {
      setError("Could not create claim. Try again.");
    } finally {
      setLoading("");
    }
  }

  async function handleSubmitIncident(
    report: string, date: string, location: string, value: string
  ) {
    if (!claimId) return;
    setLoading("Saving incident report..."); setError("");
    const acc = getAccount();
    const role = roleRef.current ?? "A";
    try {
      await submitIncidentReport(acc, claimId, role, report, date, location, value);
      if (selectedMode === "SINGLE") setScreen("evidence");
      else setScreen(role === "A" ? "multi_evidence" : "multi_evidence_b");
    } catch { setError("Could not save. Try again."); }
    finally { setLoading(""); }
  }

  async function handleSubmitEvidence(
    evidenceDesc: string, thirdParty: boolean, thirdPartyName: string
  ) {
    if (!claimId) return;
    setLoading("Submitting evidence..."); setError("");
    const acc = getAccount();
    const role = roleRef.current ?? "A";
    try {
      await submitEvidence(acc, claimId, role, evidenceDesc, thirdParty, thirdPartyName);
      if (selectedMode === "SINGLE") {
        setScreen("questions_loading");
        startPolling(claimId);
      } else if (role === "A") {
        setScreen("multi_questions_loading_a");
        startPolling(claimId);
      } else {
        setScreen("multi_questions_loading_b");
        startPolling(claimId);
      }
    } catch { setError("Could not submit. Try again."); }
    finally { setLoading(""); }
  }

  async function handleSubmitAnswers(answers: Record<string, string>) {
    if (!claimId) return;
    setLoading("Submitting answers..."); setError("");
    const acc = getAccount();
    const role = roleRef.current ?? "A";
    try {
      await submitAnswers(acc, claimId, role, answers);
      localStorage.removeItem(LS_DRAFT_KEY);
      if (selectedMode === "SINGLE") {
        setScreen("verdict_loading");
        startPolling(claimId);
      } else if (role === "A") {
        // Party A done — store timestamp, go to share/waiting
        localStorage.setItem(LS_PARTY_A_TS, String(Date.now()));
        setScreen("share");
      } else {
        // Party B done — both complete, go to verdict loading
        setScreen("verdict_loading_multi");
        startPolling(claimId);
      }
    } catch { setError("Could not submit. Try again."); }
    finally { setLoading(""); }
  }

  async function handleFinaliseUncontested() {
    if (!claimId) return;
    setLoading("Finalising claim..."); setError("");
    const acc = getAccount();
    try {
      await finaliseUncontested(acc, claimId);
      setScreen("verdict_loading_multi");
      startPolling(claimId);
    } catch { setError("Could not finalise. Try again."); }
    finally { setLoading(""); }
  }

  // Party B joins via respondent code
  async function handleJoin(code: string, name: string) {
    setLoading("Joining claim..."); setError("");
    const acc = getAccount();
    localStorage.setItem(LS_NAME_KEY, name.trim());
    setClaimantName(name.trim());
    try {
      const cid = await joinClaim(acc, code, name.trim());
      if (!cid) { setError("Code not found or claim not ready. Check and try again."); return; }
      setClaimId(cid);
      setPartyRole("B");
      roleRef.current = "B";
      setSelectedMode("MULTI");
      localStorage.setItem(LS_CLAIM_KEY, cid);
      localStorage.setItem(LS_ROLE_KEY, "B");
      resetState();
      setScreen("multi_incident_b");
    } catch { setError("Could not join claim. Try again."); }
    finally { setLoading(""); }
  }

  function handleRejoin(rejoinedClaim: ClaimData, role: "A" | "B") {
    setClaim(rejoinedClaim);
    setClaimId(rejoinedClaim.claim_id);
    setSelectedMode(rejoinedClaim.claim_mode);
    setSelectedType(rejoinedClaim.claim_type as ClaimType);
    setClaimantName(role === "A" ? rejoinedClaim.claimant_name : rejoinedClaim.party_b_name);
    setPartyRole(role);
    roleRef.current = role;
    localStorage.setItem(LS_CLAIM_KEY, rejoinedClaim.claim_id);
    localStorage.setItem(LS_ROLE_KEY, role);
    resetState();
    setError("");

    const s = rejoinedClaim.status;
    const mode = rejoinedClaim.claim_mode;

    if (s === "completed")   { stopPolling(); setScreen(mode === "SINGLE" ? "results" : "results_multi"); return; }
    if (s === "uncontested") { stopPolling(); setScreen("results_uncontested"); return; }

    if (mode === "SINGLE") {
      if (s === "answering")    { setScreen("answers"); return; }
      if (s === "questioning")  { setScreen("questions_loading"); startPolling(rejoinedClaim.claim_id); return; }
      if (s === "judging")      { setScreen("verdict_loading"); startPolling(rejoinedClaim.claim_id); return; }
      if (s === "evidence")     { setScreen("evidence"); return; }
      setScreen("incident_report"); return;
    }

    if (mode === "MULTI") {
      if (role === "A") {
        if (s === "party_a_answering")   { setScreen("multi_answers_a"); return; }
        if (s === "party_a_questioning") { setScreen("multi_questions_loading_a"); startPolling(rejoinedClaim.claim_id); return; }
        if (s === "party_a_complete")    { setScreen("waiting"); return; }
        if (s === "judging")             { setScreen("verdict_loading_multi"); startPolling(rejoinedClaim.claim_id); return; }
        if (s === "party_b_joined" || s === "party_b_active" || s === "party_b_questioning" || s === "party_b_answering") {
          setScreen("waiting"); return;
        }
        setScreen("multi_incident"); return;
      }
      if (role === "B") {
        if (s === "party_b_answering")   { setScreen("multi_answers_b"); return; }
        if (s === "party_b_questioning") { setScreen("multi_questions_loading_b"); startPolling(rejoinedClaim.claim_id); return; }
        if (s === "party_b_joined" || s === "party_b_active") { setScreen("multi_incident_b"); return; }
        if (s === "judging")             { setScreen("verdict_loading_multi"); startPolling(rejoinedClaim.claim_id); return; }
        setScreen("join"); return;
      }
    }

    setScreen("landing");
  }

  function handleStartFresh() {
    stopPolling();
    setClaim(null); setClaimId(""); setRespondentCode("");
    setPartyRole(null); roleRef.current = null;
    setError(""); setLoading("");
    resetState();
    setScreen("landing");
  }

  // ── Render ────────────────────────────────────────────────────
  const addr = addressRef.current;

  switch (screen) {
    case "landing":
      return <LandingScreen onStartClaim={handleStartClaim} onLookupClaim={() => setScreen("claim_lookup")} onJoinClaim={() => setScreen("join")} loading={loading} error={error} savedName={claimantName} />;

    case "claim_type":
      return <ClaimTypeScreen onSelectType={handleSelectType} onBack={() => setScreen("landing")} loading={loading} error={error} />;

    case "claim_mode":
      return <ClaimModeScreen selectedType={selectedType} onSelectMode={handleSelectMode} onBack={() => setScreen("claim_type")} loading={loading} error={error} />;

    // Single-party
    case "incident_report":
      return <IncidentScreen claimId={claimId} claimType={selectedType} party="A" onSubmit={handleSubmitIncident} onBack={() => setScreen("claim_mode")} loading={loading} error={error} />;
    case "evidence":
      return <EvidenceScreen claimId={claimId} claimType={selectedType} party="A" onSubmit={handleSubmitEvidence} onBack={() => setScreen("incident_report")} loading={loading} error={error} />;
    case "questions_loading":
      return <QuestionsLoading claimId={claimId} />;
    case "answers":
      return <AnswersScreen claimId={claimId} claim={claim} party="A" onSubmit={handleSubmitAnswers} loading={loading} error={error} draftKey={LS_DRAFT_KEY} />;
    case "verdict_loading":
      return <VerdictLoading claimId={claimId} onHome={handleStartFresh} />;
    case "results":
      if (!claim) return null;
      return <ResultsScreen claim={claim} claimantAddress={addr} onNewClaim={handleStartFresh} onHome={handleStartFresh} />;

    // Multi-party — Party A
    case "multi_incident":
      return <IncidentScreen claimId={claimId} claimType={selectedType} party="A" onSubmit={handleSubmitIncident} onBack={() => setScreen("claim_mode")} loading={loading} error={error} />;
    case "multi_evidence":
      return <EvidenceScreen claimId={claimId} claimType={selectedType} party="A" onSubmit={handleSubmitEvidence} onBack={() => setScreen("multi_incident")} loading={loading} error={error} />;
    case "multi_questions_loading_a":
      return <QuestionsLoading claimId={claimId} partyLabel="Your" />;
    case "multi_answers_a":
      return <AnswersScreen claimId={claimId} claim={claim} party="A" onSubmit={handleSubmitAnswers} loading={loading} error={error} draftKey={LS_DRAFT_KEY} />;
    case "share":
      return <ShareScreen claimId={claimId} respondentCode={respondentCode} onContinue={() => setScreen("waiting")} />;
    case "waiting":
      return <WaitingScreen claimId={claimId} claim={claim} partyATs={Number(localStorage.getItem(LS_PARTY_A_TS) || 0)} onFinalise={handleFinaliseUncontested} onRefresh={() => startPolling(claimId)} onHome={handleStartFresh} loading={loading} />;

    // Multi-party — Party B
    case "join":
      return <JoinScreen onJoin={handleJoin} onBack={() => setScreen("landing")} loading={loading} error={error} />;
    case "multi_incident_b":
      return <IncidentScreen claimId={claimId} claimType={selectedType} party="B" onSubmit={handleSubmitIncident} onBack={() => setScreen("join")} loading={loading} error={error} />;
    case "multi_evidence_b":
      return <EvidenceScreen claimId={claimId} claimType={selectedType} party="B" onSubmit={handleSubmitEvidence} onBack={() => setScreen("multi_incident_b")} loading={loading} error={error} />;
    case "multi_questions_loading_b":
      return <QuestionsLoading claimId={claimId} partyLabel="Your" />;
    case "multi_answers_b":
      return <AnswersScreen claimId={claimId} claim={claim} party="B" onSubmit={handleSubmitAnswers} loading={loading} error={error} draftKey={LS_DRAFT_KEY} />;

    // Shared outcome
    case "verdict_loading_multi":
      return <VerdictLoading claimId={claimId} onHome={handleStartFresh} isMulti />;
    case "results_multi":
      if (!claim) return null;
      return <ResultsMultiScreen claim={claim} myAddress={addr} partyRole={partyRole ?? "A"} onNewClaim={handleStartFresh} onHome={handleStartFresh} />;
    case "results_uncontested":
      if (!claim) return null;
      return <ResultsUncontestedScreen claim={claim} onNewClaim={handleStartFresh} onHome={handleStartFresh} />;

    case "claim_lookup":
      return <ClaimLookupScreen claimantAddress={addr} onRejoin={handleRejoin} onBack={() => setScreen("landing")} />;

    default:
      return null;
  }
}
