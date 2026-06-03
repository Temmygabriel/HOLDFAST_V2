// HOLDFAST v2 — GenLayer Contract Utils
// Core writeContract / writeContractWithReturn / readContract
// copied exactly from build guide — never change these three functions.

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import {
  ClaimData,
  ClaimantStats,
  RecentClaimEntry,
  ClaimPreview,
  ClaimMode,
  ClaimType,
} from "../types";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const MAX_ATTEMPTS = 3;

function makeClient(account: ReturnType<typeof createAccount>) {
  return createClient({ chain: studionet, account });
}

export function makeAccount(privateKey?: `0x${string}`) {
  return createAccount(privateKey);
}

// ----------------------------------------------------------------
// Core write — no return value. Never change.
// ----------------------------------------------------------------
export async function writeContract(
  account: ReturnType<typeof createAccount>,
  method: string,
  args: unknown[]
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const client = makeClient(account);
      console.log(`writeContract attempt ${attempt}/${MAX_ATTEMPTS}: ${method}`);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: method,
        args,
        account,
        leaderOnly: false,
      } as any);
      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        retries: 120,
        interval: 4000,
      });
      console.log(`writeContract success: ${method}`);
      return;
    } catch (err: any) {
      console.error(`writeContract ${method} attempt ${attempt} failed:`, err?.message, err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 3000));
        continue;
      }
      throw err;
    }
  }
}

// ----------------------------------------------------------------
// Write with return value. Never change.
// ----------------------------------------------------------------
export async function writeContractWithReturn(
  account: ReturnType<typeof createAccount>,
  method: string,
  args: unknown[]
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const client = makeClient(account);
      console.log(`writeContractWithReturn attempt ${attempt}/${MAX_ATTEMPTS}: ${method}`);
      const returnValue = await client.simulateWriteContract({
        address: CONTRACT_ADDRESS,
        functionName: method,
        args,
      });
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: method,
        args,
        account,
        leaderOnly: false,
      } as any);
      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        retries: 120,
        interval: 4000,
      });
      console.log(`writeContractWithReturn success: ${method}, returned:`, returnValue);
      return returnValue as string;
    } catch (err: any) {
      console.error(`writeContractWithReturn ${method} attempt ${attempt} failed:`, err?.message, err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 3000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("All attempts failed");
}

// ----------------------------------------------------------------
// Core read. Never change.
// ----------------------------------------------------------------
export async function readContract(method: string, args: unknown[]): Promise<string> {
  const account = createAccount();
  const client  = makeClient(account);
  const result  = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
  });
  return result as string;
}

// ================================================================
// HOLDFAST v2 WRAPPERS
// ================================================================

// ----------------------------------------------------------------
// create_claim — SINGLE or MULTI
// SINGLE returns: "CLAIM_ID"
// MULTI  returns: "CLAIM_ID|RESPONDENT_CODE"
// Frontend splits on "|"
// ----------------------------------------------------------------
export async function createClaim(
  account: ReturnType<typeof createAccount>,
  claimantName: string,
  claimType: ClaimType,
  claimMode: ClaimMode
): Promise<{ claimId: string; respondentCode: string }> {
  const raw = await writeContractWithReturn(account, "create_claim", [
    account.address,
    claimantName,
    claimType,
    claimMode,
  ]);
  if (raw.includes("|")) {
    const [claimId, respondentCode] = raw.split("|");
    return { claimId, respondentCode };
  }
  return { claimId: raw, respondentCode: "" };
}

// ----------------------------------------------------------------
// join_claim — Party B enters respondent code
// Returns claim_id on success, empty string on failure
// ----------------------------------------------------------------
export async function joinClaim(
  account: ReturnType<typeof createAccount>,
  respondentCode: string,
  partyBName: string
): Promise<string> {
  return writeContractWithReturn(account, "join_claim", [
    respondentCode.toUpperCase(),
    account.address,
    partyBName,
  ]);
}

// ----------------------------------------------------------------
// submit_incident_report — party "A" or "B"
// ----------------------------------------------------------------
export async function submitIncidentReport(
  account: ReturnType<typeof createAccount>,
  claimId: string,
  party: "A" | "B",
  incidentReport: string,
  incidentDate: string,
  incidentLocation: string,
  estimatedValue: string
): Promise<void> {
  return writeContract(account, "submit_incident_report", [
    claimId,
    party,
    incidentReport,
    incidentDate,
    incidentLocation,
    estimatedValue,
  ]);
}

// ----------------------------------------------------------------
// submit_evidence — party "A" or "B"
// ----------------------------------------------------------------
export async function submitEvidence(
  account: ReturnType<typeof createAccount>,
  claimId: string,
  party: "A" | "B",
  evidenceDescription: string,
  thirdPartyInvolved: boolean,
  thirdPartyName: string
): Promise<void> {
  return writeContract(account, "submit_evidence", [
    claimId,
    party,
    evidenceDescription,
    thirdPartyInvolved,
    thirdPartyName,
  ]);
}

// ----------------------------------------------------------------
// generate_questions — SINGLE Party A (AI Call 1/2)
// ----------------------------------------------------------------
export async function generateQuestions(
  account: ReturnType<typeof createAccount>,
  claimId: string
): Promise<void> {
  return writeContract(account, "generate_questions", [claimId]);
}

// ----------------------------------------------------------------
// generate_questions_a — MULTI Party A (AI Call 1/3)
// ----------------------------------------------------------------
export async function generateQuestionsA(
  account: ReturnType<typeof createAccount>,
  claimId: string
): Promise<void> {
  return writeContract(account, "generate_questions_a", [claimId]);
}

// ----------------------------------------------------------------
// generate_questions_b — MULTI Party B (AI Call 2/3)
// ----------------------------------------------------------------
export async function generateQuestionsB(
  account: ReturnType<typeof createAccount>,
  claimId: string
): Promise<void> {
  return writeContract(account, "generate_questions_b", [claimId]);
}

// ----------------------------------------------------------------
// submit_answers — party "A" or "B", all 4 answers, single tx
// ----------------------------------------------------------------
export async function submitAnswers(
  account: ReturnType<typeof createAccount>,
  claimId: string,
  party: "A" | "B",
  answers: Record<string, string>
): Promise<void> {
  return writeContract(account, "submit_answers", [
    claimId,
    party,
    JSON.stringify(answers),
  ]);
}

// ----------------------------------------------------------------
// calculate_verdict — SINGLE AI Call 2/2
// ----------------------------------------------------------------
export async function calculateVerdict(
  account: ReturnType<typeof createAccount>,
  claimId: string
): Promise<void> {
  return writeContract(account, "calculate_verdict", [claimId]);
}

// ----------------------------------------------------------------
// calculate_comparative_verdict — MULTI AI Call 3/3
// ----------------------------------------------------------------
export async function calculateComparativeVerdict(
  account: ReturnType<typeof createAccount>,
  claimId: string
): Promise<void> {
  return writeContract(account, "calculate_comparative_verdict", [claimId]);
}

// ----------------------------------------------------------------
// finalise_uncontested — Party A calls after 7 days no Party B
// ----------------------------------------------------------------
export async function finaliseUncontested(
  account: ReturnType<typeof createAccount>,
  claimId: string
): Promise<void> {
  return writeContract(account, "finalise_uncontested", [claimId]);
}

// ----------------------------------------------------------------
// Read wrappers
// ----------------------------------------------------------------
export async function getClaim(claimId: string): Promise<ClaimData> {
  const raw = await readContract("get_claim", [claimId]);
  return JSON.parse(raw) as ClaimData;
}

export async function getClaimByRespondentCode(
  respondentCode: string
): Promise<ClaimPreview> {
  const raw = await readContract("get_claim_by_respondent_code", [
    respondentCode.toUpperCase(),
  ]);
  return JSON.parse(raw) as ClaimPreview;
}

export async function getClaimantStats(address: string): Promise<ClaimantStats> {
  const raw = await readContract("get_claimant_stats", [address]);
  return JSON.parse(raw) as ClaimantStats;
}

export async function getRecentClaims(): Promise<RecentClaimEntry[]> {
  const raw = await readContract("get_recent_claims", []);
  return JSON.parse(raw) as RecentClaimEntry[];
}
