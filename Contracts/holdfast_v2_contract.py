# HOLDFAST — On-Chain Insurance Claims Verification Protocol
# v2.0.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
#
# Two claim modes:
#   SINGLE — one claimant, no other party (medical, device, travel, solo property)
#            Same 2 AI calls as v1. Unchanged flow.
#   MULTI  — two parties submitting independently (auto accidents, liability, disputed property)
#            3 AI calls: generate_questions_a, generate_questions_b, calculate_comparative_verdict
#
# Multi-party status track:
#   created → party_a_active → party_a_complete → party_b_joined →
#   party_b_active → judging → completed | uncontested
#
# Single-party status track (unchanged from v1):
#   submitted → evidence → questioning → answering → judging → completed

import genlayer.gl as gl
from genlayer import TreeMap, u256
import json

# ----------------------------------------------------------------
# Fallback questions — per claim type, used if AI call fails
# ----------------------------------------------------------------

FALLBACK_QUESTIONS = {
    "AUTO": [
        "Can you describe the exact sequence of events immediately before the collision, including your speed and the other vehicle's behaviour?",
        "Were there any traffic signals, road markings, or signage at or near the incident location?",
        "Have you obtained a police incident report number, and if so, what is it?",
        "Did you or any other party involved receive medical attention at the scene or shortly after?"
    ],
    "PROPERTY": [
        "Can you describe the exact condition of the property the day before the incident occurred?",
        "Were there any prior incidents of damage, repair, or insurance claims on this property in the last five years?",
        "Who had access to the property at the time of the incident, and can any of them verify your account?",
        "Have you made any recent modifications or renovations to the property, and if so, when were they completed?"
    ],
    "TRAVEL": [
        "Can you provide the exact booking reference and airline or carrier name for the affected journey?",
        "Did you receive any written confirmation or documentation from the carrier acknowledging the disruption?",
        "Were there other passengers on the same booking who were also affected?",
        "Had you purchased any travel insurance or protection separately through your bank or credit card provider?"
    ],
    "DEVICE": [
        "Can you provide the device's serial number, IMEI, or any other unique identifier?",
        "Where was the device purchased, and do you still have the original receipt or proof of purchase?",
        "Can you describe exactly where the device was and what you were doing when the damage or theft occurred?",
        "Have you made any previous insurance claims for this device or a similar device in the last three years?"
    ],
    "LIABILITY": [
        "Can you describe exactly how the third party sustained their injury or damage, and where you were at the time?",
        "Were there any witnesses present who can independently corroborate your account of the incident?",
        "Has the third party filed a formal complaint or initiated legal proceedings against you?",
        "Did you take any photographs or video at the scene, and if so, can you describe what they show?"
    ],
    "MEDICAL": [
        "Can you provide the name and registration number of the medical professional who diagnosed or treated you?",
        "Had you experienced any symptoms, conditions, or treatments related to this claim before the policy start date?",
        "Were the treatment costs incurred at a facility that accepts your insurance, or were they out-of-network?",
        "Do you have itemised receipts or medical invoices for every expense included in your claim amount?"
    ]
}

# ----------------------------------------------------------------
# Respondent code generator — separate namespace from claim IDs
# Uses different multipliers so codes never collide with claim IDs
# ----------------------------------------------------------------

def _make_respondent_code(claim_count: int, recent_count: int) -> str:
    n = claim_count * 1013 + recent_count * 89 + 31
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = ""
    for _ in range(6):
        code = code + chars[n % len(chars)]
        n = n // len(chars)
    return code


class Holdfast(gl.Contract):

    claim_count:  u256
    recent_count: u256
    claims:       TreeMap[str, str]
    # Maps respondent_code → claim_id for Party B join flow
    respondent_codes: TreeMap[str, str]
    claimant_stats:   TreeMap[str, str]
    recent_claim_ids: TreeMap[u256, str]

    def __init__(self):
        self.claim_count  = u256(0)
        self.recent_count = u256(0)

    # ----------------------------------------------------------------
    # Storage helpers
    # ----------------------------------------------------------------

    def _read_claim(self, claim_id: str) -> dict:
        return json.loads(self.claims[claim_id])

    def _write_claim(self, claim_id: str, data: dict) -> None:
        self.claims[claim_id] = json.dumps(data)

    def _read_stats(self, address: str) -> dict:
        raw = self.claimant_stats.get(address)
        if raw is None:
            return {
                "claims_submitted": 0,
                "consistent_claims": 0,
                "review_claims": 0,
                "contradictory_claims": 0,
                "display_name": ""
            }
        return json.loads(raw)

    def _write_stats(self, address: str, stats: dict) -> None:
        self.claimant_stats[address] = json.dumps(stats)

    def _make_claim_id(self) -> str:
        self.claim_count = u256(int(self.claim_count) + 1)
        n = int(self.claim_count) * 1009 + int(self.recent_count) * 97 + 17
        chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        code = ""
        for _ in range(6):
            code = code + chars[n % len(chars)]
            n = n // len(chars)
        return code

    def _validate_questions(self, parsed_questions: list, claim_type: str) -> list:
        """Validates AI question output and fills missing slots with fallbacks."""
        fallbacks = FALLBACK_QUESTIONS.get(claim_type, FALLBACK_QUESTIONS["AUTO"])
        questions = []
        if isinstance(parsed_questions, list) and len(parsed_questions) >= 1:
            questions = [str(q) for q in parsed_questions[:4]]
        while len(questions) < 4:
            questions.append(fallbacks[len(questions)])
        return questions[:4]

    def _parse_verdict(self, result_raw: str, fallback_reasoning: str) -> dict:
        """
        Defensive parse of AI verdict JSON.
        Always returns a valid dict — never raises.
        """
        try:
            start = result_raw.find("{")
            end   = result_raw.rfind("}") + 1
            if start >= 0 and end > start:
                parsed = json.loads(result_raw[start:end])

                verdict_val = parsed.get("verdict", "REVIEW")
                if verdict_val not in ["CONSISTENT", "REVIEW", "CONTRADICTORY"]:
                    verdict_val = "REVIEW"

                rec_val = parsed.get("recommendation", "REVIEW")
                if rec_val not in ["APPROVE", "REVIEW", "DENY"]:
                    rec_val = "REVIEW"

                score = parsed.get("credibility_score", 50)
                try:
                    score = int(score)
                    score = max(0, min(100, score))
                except Exception:
                    score = 50

                flags = parsed.get("flags", [])
                if not isinstance(flags, list):
                    flags = []
                flags = [str(f) for f in flags if f]

                reasoning = str(parsed.get("reasoning", fallback_reasoning))

                return {
                    "verdict":          verdict_val,
                    "credibility_score": score,
                    "reasoning":        reasoning,
                    "flags":            flags,
                    "recommendation":   rec_val
                }
        except Exception:
            pass

        return {
            "verdict":           "REVIEW",
            "credibility_score": 50,
            "reasoning":         fallback_reasoning,
            "flags":             [],
            "recommendation":    "REVIEW"
        }

    # ================================================================
    # PUBLIC WRITE METHODS
    # ================================================================

    # ----------------------------------------------------------------
    # create_claim — works for both SINGLE and MULTI
    # claim_mode: "SINGLE" or "MULTI"
    # Returns claim_id for SINGLE, "claim_id|respondent_code" for MULTI
    # Frontend splits on "|" to get both values
    # ----------------------------------------------------------------
    @gl.public.write
    def create_claim(
        self,
        claimant_address: str,
        claimant_name:    str,
        claim_type:       str,
        claim_mode:       str
    ) -> str:
        valid_types = ["AUTO", "PROPERTY", "TRAVEL", "DEVICE", "LIABILITY", "MEDICAL"]
        if claim_type not in valid_types:
            claim_type = "AUTO"
        if claim_mode not in ["SINGLE", "MULTI"]:
            claim_mode = "SINGLE"

        claim_id = self._make_claim_id()

        # Generate respondent code for MULTI claims
        respondent_code = ""
        if claim_mode == "MULTI":
            respondent_code = _make_respondent_code(
                int(self.claim_count),
                int(self.recent_count)
            )
            # Register the mapping so Party B can look up claim_id by respondent_code
            self.respondent_codes[respondent_code] = claim_id

        # ── Single-party fields (identical to v1) ──────────────────
        claim_data = {
            "claim_id":        claim_id,
            "claim_mode":      claim_mode,
            "claim_type":      claim_type,
            "created_at":      int(self.claim_count),

            # Party A identity
            "claimant_address": claimant_address,
            "claimant_name":    claimant_name,

            # SINGLE status track: submitted→evidence→questioning→answering→judging→completed
            # MULTI  status track: created→party_a_active→party_a_complete→
            #                      party_b_joined→party_b_active→judging→completed|uncontested
            "status": "submitted" if claim_mode == "SINGLE" else "created",

            # Stage 1 — Party A incident report
            "incident_report":   "",
            "incident_date":     "",
            "incident_location": "",
            "estimated_value":   "",

            # Stage 2 — Party A evidence
            "evidence_description":  "",
            "third_party_involved":  False,
            "third_party_name":      "",

            # Stage 3 — Party A questions + answers
            "questions": [],
            "answers":   {},

            # Stage 4 — single-party verdict
            "verdict": {},

            # ── Multi-party only fields ────────────────────────────
            "respondent_code": respondent_code,

            # Party B identity
            "party_b_address":  "",
            "party_b_name":     "",

            # Party B Stage 1
            "party_b_incident_report":   "",
            "party_b_incident_date":     "",
            "party_b_incident_location": "",
            "party_b_estimated_value":   "",

            # Party B Stage 2
            "party_b_evidence_description": "",
            "party_b_third_party_involved": False,
            "party_b_third_party_name":     "",

            # Party B Stage 3
            "party_b_questions": [],
            "party_b_answers":   {},

            # Comparative verdict — produced by calculate_comparative_verdict
            "comparative_verdict": {},

            # Sequence number when Party A completed — used for 7-day timeout check
            "party_a_complete_seq": 0,
        }

        self._write_claim(claim_id, claim_data)

        stats = self._read_stats(claimant_address)
        stats["display_name"] = claimant_name
        self._write_stats(claimant_address, stats)

        # Return format: "claim_id" for SINGLE, "claim_id|respondent_code" for MULTI
        if claim_mode == "MULTI":
            return claim_id + "|" + respondent_code
        return claim_id

    # ----------------------------------------------------------------
    # join_claim — Party B enters the respondent code
    # Returns the claim_id so the frontend can load the full claim
    # ----------------------------------------------------------------
    @gl.public.write
    def join_claim(
        self,
        respondent_code: str,
        party_b_address: str,
        party_b_name:    str
    ) -> str:
        claim_id = self.respondent_codes.get(respondent_code)
        if claim_id is None:
            return ""

        claim = self._read_claim(claim_id)

        # Only allow join when Party A has completed their full submission
        if claim["status"] != "party_a_complete":
            return ""

        # Prevent Party A from joining as Party B
        if claim["claimant_address"] == party_b_address:
            return ""

        # Prevent double-join
        if claim["party_b_address"]:
            return ""

        claim["party_b_address"] = party_b_address
        claim["party_b_name"]    = party_b_name
        claim["status"]          = "party_b_joined"

        self._write_claim(claim_id, claim)

        stats = self._read_stats(party_b_address)
        stats["display_name"] = party_b_name
        self._write_stats(party_b_address, stats)

        return claim_id

    # ----------------------------------------------------------------
    # submit_incident_report
    # Handles both Party A (SINGLE and MULTI) and Party B (MULTI)
    # party: "A" or "B"
    # ----------------------------------------------------------------
    @gl.public.write
    def submit_incident_report(
        self,
        claim_id:         str,
        party:            str,
        incident_report:  str,
        incident_date:    str,
        incident_location:str,
        estimated_value:  str
    ) -> None:
        claim = self._read_claim(claim_id)

        if not incident_report.strip(): return
        if not incident_date.strip():   return
        if not incident_location.strip(): return
        if not estimated_value.strip():  return

        if party == "A":
            # SINGLE: gate on "submitted"; MULTI: gate on "created"
            valid = (
                (claim["claim_mode"] == "SINGLE" and claim["status"] == "submitted") or
                (claim["claim_mode"] == "MULTI"  and claim["status"] == "created")
            )
            if not valid: return

            claim["incident_report"]   = incident_report.strip()
            claim["incident_date"]     = incident_date.strip()
            claim["incident_location"] = incident_location.strip()
            claim["estimated_value"]   = estimated_value.strip()
            claim["status"] = "evidence" if claim["claim_mode"] == "SINGLE" else "party_a_active"

        elif party == "B":
            # Party B can only submit when in party_b_joined or party_b_active
            if claim["status"] not in ["party_b_joined", "party_b_active"]: return

            claim["party_b_incident_report"]   = incident_report.strip()
            claim["party_b_incident_date"]     = incident_date.strip()
            claim["party_b_incident_location"] = incident_location.strip()
            claim["party_b_estimated_value"]   = estimated_value.strip()
            claim["status"] = "party_b_active"

        else:
            return

        self._write_claim(claim_id, claim)

    # ----------------------------------------------------------------
    # submit_evidence
    # Handles Party A (SINGLE and MULTI) and Party B (MULTI)
    # party: "A" or "B"
    # For MULTI Party A: advances to party_a_active (questioning triggered next)
    # For MULTI Party B: advances to party_b_active (questioning triggered next)
    # ----------------------------------------------------------------
    @gl.public.write
    def submit_evidence(
        self,
        claim_id:            str,
        party:               str,
        evidence_description:str,
        third_party_involved: bool,
        third_party_name:    str
    ) -> None:
        claim = self._read_claim(claim_id)

        if not evidence_description.strip(): return

        if party == "A":
            valid = (
                (claim["claim_mode"] == "SINGLE" and claim["status"] == "evidence") or
                (claim["claim_mode"] == "MULTI"  and claim["status"] == "party_a_active")
            )
            if not valid: return

            claim["evidence_description"] = evidence_description.strip()
            claim["third_party_involved"] = third_party_involved
            claim["third_party_name"]     = third_party_name.strip() if third_party_involved else ""

            # Advance to questioning — triggers generate_questions_a from frontend
            claim["status"] = "questioning" if claim["claim_mode"] == "SINGLE" else "party_a_questioning"

        elif party == "B":
            if claim["status"] != "party_b_active": return

            claim["party_b_evidence_description"] = evidence_description.strip()
            claim["party_b_third_party_involved"] = third_party_involved
            claim["party_b_third_party_name"]     = third_party_name.strip() if third_party_involved else ""
            claim["status"] = "party_b_questioning"

        else:
            return

        self._write_claim(claim_id, claim)

    # ----------------------------------------------------------------
    # generate_questions — SINGLE Party A (AI Call 1 of 2 for SINGLE)
    # Unchanged from v1 except status gate now also checks "questioning"
    # ----------------------------------------------------------------
    @gl.public.write
    def generate_questions(self, claim_id: str) -> None:
        """
        AI Call — generates 4 questions for single-party claims.
        Status gate: questioning → answering
        """
        claim = self._read_claim(claim_id)

        if claim["status"] != "questioning":
            return

        prompt = (
            "You are a senior insurance claims adjuster with 20 years of experience detecting fraud and inconsistency. "
            "A claimant has submitted a " + claim["claim_type"] + " insurance claim. "
            "Read their incident report and evidence description carefully. "
            "Generate exactly 4 follow-up questions that are SPECIFIC to what this claimant actually wrote. "
            "Your questions must probe: timeline gaps, vague language, implausible details, "
            "missing evidence, or anything that a fraudulent account would struggle to answer consistently. "
            "Do NOT ask generic questions. Every question must reference something specific from their account.\n\n"
            "CLAIM TYPE: " + claim["claim_type"] + "\n"
            "INCIDENT DATE: " + claim["incident_date"] + "\n"
            "INCIDENT LOCATION: " + claim["incident_location"] + "\n"
            "ESTIMATED VALUE: " + claim["estimated_value"] + "\n"
            "INCIDENT REPORT:\n" + claim["incident_report"] + "\n\n"
            "EVIDENCE DESCRIBED:\n" + claim["evidence_description"] + "\n\n"
            "Return ONLY a JSON object starting with { and ending with }. No markdown. No preamble. "
            'Format: {"questions": ["question 1", "question 2", "question 3", "question 4"]}'
        )

        def generate():
            return gl.nondet.exec_prompt(prompt)

        result_raw = gl.eq_principle.prompt_non_comparative(
            generate,
            task="generate 4 targeted follow-up questions for an insurance claim based on the claimant's specific account",
            criteria="valid JSON object with a questions array containing exactly 4 specific follow-up questions"
        )

        questions = []
        try:
            start = result_raw.find("{")
            end   = result_raw.rfind("}") + 1
            if start >= 0 and end > start:
                parsed_questions = json.loads(result_raw[start:end]).get("questions", [])
                questions = self._validate_questions(parsed_questions, claim["claim_type"])
        except Exception:
            questions = []

        if not questions:
            questions = self._validate_questions([], claim["claim_type"])

        claim["questions"] = questions
        claim["status"]    = "answering"
        self._write_claim(claim_id, claim)

    # ----------------------------------------------------------------
    # generate_questions_a — MULTI Party A (AI Call 1 of 3 for MULTI)
    # Status gate: party_a_questioning → party_a_answering
    # ----------------------------------------------------------------
    @gl.public.write
    def generate_questions_a(self, claim_id: str) -> None:
        claim = self._read_claim(claim_id)

        if claim["status"] != "party_a_questioning":
            return

        tp_line = ""
        if claim["third_party_involved"] and claim["third_party_name"]:
            tp_line = "Third party: " + claim["third_party_name"]
        elif claim["third_party_involved"]:
            tp_line = "Third party: involved, name not provided"
        else:
            tp_line = "Third party: none stated"

        prompt = (
            "You are a senior insurance claims adjuster. "
            "Party A has submitted their account of a disputed " + claim["claim_type"] + " incident. "
            "This is a multi-party claim — another party will submit their account separately. "
            "Generate exactly 4 follow-up questions SPECIFIC to what Party A wrote. "
            "Focus on: timeline precision, witness details, physical evidence described, "
            "any vague or implausible statements in their account. "
            "Do NOT ask generic questions. Every question must reference something specific.\n\n"
            "PARTY A INCIDENT REPORT:\n" + claim["incident_report"] + "\n\n"
            "PARTY A EVIDENCE:\n" + claim["evidence_description"] + "\n"
            "DATE: " + claim["incident_date"] + " | LOCATION: " + claim["incident_location"] + "\n"
            "VALUE: " + claim["estimated_value"] + " | " + tp_line + "\n\n"
            "Return ONLY valid JSON: "
            '{"questions": ["q1", "q2", "q3", "q4"]}'
        )

        def generate():
            return gl.nondet.exec_prompt(prompt)

        result_raw = gl.eq_principle.prompt_non_comparative(
            generate,
            task="generate 4 targeted follow-up questions for Party A in a multi-party insurance dispute",
            criteria="valid JSON with questions array containing 4 specific questions relevant to Party A's account"
        )

        questions = []
        try:
            start = result_raw.find("{")
            end   = result_raw.rfind("}") + 1
            if start >= 0 and end > start:
                questions = self._validate_questions(
                    json.loads(result_raw[start:end]).get("questions", []),
                    claim["claim_type"]
                )
        except Exception:
            pass

        if not questions:
            questions = self._validate_questions([], claim["claim_type"])

        claim["questions"] = questions
        claim["status"]    = "party_a_answering"
        self._write_claim(claim_id, claim)

    # ----------------------------------------------------------------
    # generate_questions_b — MULTI Party B (AI Call 2 of 3 for MULTI)
    # Status gate: party_b_questioning → party_b_answering
    # Party B's questions are generated WITHOUT seeing Party A's answers —
    # complete independence preserved
    # ----------------------------------------------------------------
    @gl.public.write
    def generate_questions_b(self, claim_id: str) -> None:
        claim = self._read_claim(claim_id)

        if claim["status"] != "party_b_questioning":
            return

        tp_line = ""
        if claim["party_b_third_party_involved"] and claim["party_b_third_party_name"]:
            tp_line = "Third party: " + claim["party_b_third_party_name"]
        elif claim["party_b_third_party_involved"]:
            tp_line = "Third party: involved, name not provided"
        else:
            tp_line = "Third party: none stated"

        prompt = (
            "You are a senior insurance claims adjuster. "
            "Party B has submitted their account of a disputed " + claim["claim_type"] + " incident. "
            "This is a multi-party claim — another party has already submitted their account separately. "
            "You have NOT seen the other party's account. Generate questions based solely on what Party B wrote. "
            "Generate exactly 4 follow-up questions SPECIFIC to what Party B wrote. "
            "Focus on: timeline precision, physical evidence, witness details, "
            "any vague or implausible statements.\n\n"
            "PARTY B INCIDENT REPORT:\n" + claim["party_b_incident_report"] + "\n\n"
            "PARTY B EVIDENCE:\n" + claim["party_b_evidence_description"] + "\n"
            "DATE: " + claim["party_b_incident_date"] + " | LOCATION: " + claim["party_b_incident_location"] + "\n"
            "VALUE: " + claim["party_b_estimated_value"] + " | " + tp_line + "\n\n"
            "Return ONLY valid JSON: "
            '{"questions": ["q1", "q2", "q3", "q4"]}'
        )

        def generate():
            return gl.nondet.exec_prompt(prompt)

        result_raw = gl.eq_principle.prompt_non_comparative(
            generate,
            task="generate 4 targeted follow-up questions for Party B in a multi-party insurance dispute",
            criteria="valid JSON with questions array containing 4 specific questions relevant to Party B's account"
        )

        questions = []
        try:
            start = result_raw.find("{")
            end   = result_raw.rfind("}") + 1
            if start >= 0 and end > start:
                questions = self._validate_questions(
                    json.loads(result_raw[start:end]).get("questions", []),
                    claim["claim_type"]
                )
        except Exception:
            pass

        if not questions:
            questions = self._validate_questions([], claim["claim_type"])

        claim["party_b_questions"] = questions
        claim["status"]            = "party_b_answering"
        self._write_claim(claim_id, claim)

    # ----------------------------------------------------------------
    # submit_answers — single transaction, all 4 answers
    # party: "A" or "B"
    # answers_json: stringified dict {"0": "...", "1": "...", "2": "...", "3": "..."}
    # ----------------------------------------------------------------
    @gl.public.write
    def submit_answers(
        self,
        claim_id:     str,
        party:        str,
        answers_json: str
    ) -> None:
        claim = self._read_claim(claim_id)

        answers = {}
        try:
            parsed = json.loads(answers_json)
            if isinstance(parsed, dict):
                for i in range(4):
                    key = str(i)
                    val = parsed.get(key, "").strip()
                    answers[key] = val if val else "No answer provided"
            else:
                for i in range(4):
                    answers[str(i)] = "No answer provided"
        except Exception:
            for i in range(4):
                answers[str(i)] = "No answer provided"

        if party == "A":
            valid = (
                (claim["claim_mode"] == "SINGLE" and claim["status"] == "answering") or
                (claim["claim_mode"] == "MULTI"  and claim["status"] == "party_a_answering")
            )
            if not valid: return

            claim["answers"] = answers

            if claim["claim_mode"] == "SINGLE":
                claim["status"] = "judging"
            else:
                # Party A done — record sequence for 7-day timeout tracking
                claim["party_a_complete_seq"] = int(self.claim_count)
                claim["status"] = "party_a_complete"

        elif party == "B":
            if claim["status"] != "party_b_answering": return

            claim["party_b_answers"] = answers
            # Both parties complete — move to judging
            claim["status"] = "judging"

        else:
            return

        self._write_claim(claim_id, claim)

    # ----------------------------------------------------------------
    # calculate_verdict — SINGLE (AI Call 2 of 2 for SINGLE)
    # Unchanged from v1. Status gate: judging (SINGLE mode only)
    # ----------------------------------------------------------------
    @gl.public.write
    def calculate_verdict(self, claim_id: str) -> None:
        claim = self._read_claim(claim_id)

        if claim["status"] != "judging":
            return
        if claim["claim_mode"] != "SINGLE":
            return

        questions = claim.get("questions", [])
        answers   = claim.get("answers", {})

        qa_lines = []
        for i, q in enumerate(questions):
            qa_lines.append("Q" + str(i + 1) + ": " + q)
            qa_lines.append("A" + str(i + 1) + ": " + answers.get(str(i), "No answer provided"))
        qa_text = "\n".join(qa_lines)

        tp_line = "No third party"
        if claim["third_party_involved"] and claim["third_party_name"]:
            tp_line = "Third party: " + claim["third_party_name"]
        elif claim["third_party_involved"]:
            tp_line = "Third party: involved"

        prompt = (
            "You are a senior insurance fraud analyst with 20 years of experience. "
            "Analyse this " + claim["claim_type"] + " insurance claim for internal consistency. "
            "Look for: direct contradictions between stages, implausible timeline or value claims, "
            "vague or evasive answers, evidence that does not match the incident described.\n\n"
            "INCIDENT DATE: " + claim["incident_date"] + " | LOCATION: " + claim["incident_location"] + "\n"
            "ESTIMATED VALUE: " + claim["estimated_value"] + " | " + tp_line + "\n\n"
            "STAGE 1 — INCIDENT REPORT:\n" + claim["incident_report"] + "\n\n"
            "STAGE 2 — EVIDENCE:\n" + claim["evidence_description"] + "\n\n"
            "STAGE 3 — Q&A:\n" + qa_text + "\n\n"
            "Render one verdict:\n"
            "CONSISTENT — coherent across all stages, no material contradictions\n"
            "REVIEW — gaps or inconsistencies detected, warrants human review\n"
            "CONTRADICTORY — statements materially contradict each other\n\n"
            "Credibility score 0–100. 100 = fully consistent. 0 = multiple direct contradictions.\n\n"
            "Return ONLY valid JSON:\n"
            '{"verdict": "CONSISTENT", "credibility_score": 85, '
            '"reasoning": "2-3 sentences referencing specific details", '
            '"flags": ["specific issue found"], "recommendation": "APPROVE"}\n'
            "recommendation must be APPROVE, REVIEW, or DENY\n"
            "CONSISTENT→APPROVE, REVIEW→REVIEW, CONTRADICTORY→DENY"
        )

        def generate():
            return gl.nondet.exec_prompt(prompt)

        result_raw = gl.eq_principle.prompt_non_comparative(
            generate,
            task="analyse a single-party insurance claim for internal consistency and render a credibility verdict",
            criteria="valid JSON with verdict, credibility_score, reasoning, flags, recommendation"
        )

        verdict_data = self._parse_verdict(
            result_raw,
            "Automated analysis could not be completed. Flagged for manual adjuster review."
        )

        claim["verdict"] = verdict_data
        claim["status"]  = "completed"
        self._write_claim(claim_id, claim)

        # Update stats
        stats = self._read_stats(claim["claimant_address"])
        stats["claims_submitted"] = stats.get("claims_submitted", 0) + 1
        stats["display_name"]     = claim["claimant_name"]
        v = verdict_data.get("verdict", "REVIEW")
        if v == "CONSISTENT":    stats["consistent_claims"]    = stats.get("consistent_claims", 0) + 1
        elif v == "REVIEW":      stats["review_claims"]        = stats.get("review_claims", 0) + 1
        elif v == "CONTRADICTORY": stats["contradictory_claims"] = stats.get("contradictory_claims", 0) + 1
        self._write_stats(claim["claimant_address"], stats)

        # Recent claims index
        idx = int(self.recent_count)
        self.recent_claim_ids[u256(idx)] = claim_id
        self.recent_count = u256(idx + 1)

    # ----------------------------------------------------------------
    # calculate_comparative_verdict — MULTI (AI Call 3 of 3 for MULTI)
    # Reads all 8 stages simultaneously.
    # Status gate: judging (MULTI mode only)
    # ----------------------------------------------------------------
    @gl.public.write
    def calculate_comparative_verdict(self, claim_id: str) -> None:
        claim = self._read_claim(claim_id)

        if claim["status"] != "judging":
            return
        if claim["claim_mode"] != "MULTI":
            return

        # Build Party A Q&A text
        a_qa_lines = []
        for i, q in enumerate(claim.get("questions", [])):
            a_qa_lines.append("Q" + str(i + 1) + ": " + q)
            a_qa_lines.append("A" + str(i + 1) + ": " + claim.get("answers", {}).get(str(i), "No answer provided"))
        a_qa_text = "\n".join(a_qa_lines)

        # Build Party B Q&A text
        b_qa_lines = []
        for i, q in enumerate(claim.get("party_b_questions", [])):
            b_qa_lines.append("Q" + str(i + 1) + ": " + q)
            b_qa_lines.append("A" + str(i + 1) + ": " + claim.get("party_b_answers", {}).get(str(i), "No answer provided"))
        b_qa_text = "\n".join(b_qa_lines)

        prompt = (
            "You are a senior insurance fraud analyst adjudicating a disputed " + claim["claim_type"] + " claim. "
            "Two parties have submitted completely independent accounts of the same incident. "
            "Neither could see the other's submission at any point.\n\n"
            "Read both accounts carefully. Your task:\n"
            "1. Assess each account independently for internal consistency\n"
            "2. Identify where the accounts agree on material facts\n"
            "3. Identify where they directly contradict each other\n"
            "4. Determine which account is more internally consistent\n\n"
            "PARTY A — " + claim["claimant_name"] + "\n"
            "Incident: " + claim["incident_date"] + " at " + claim["incident_location"] + "\n"
            "Claimed value: " + claim["estimated_value"] + "\n"
            "Report: " + claim["incident_report"] + "\n"
            "Evidence: " + claim["evidence_description"] + "\n"
            "Q&A:\n" + a_qa_text + "\n\n"
            "PARTY B — " + claim["party_b_name"] + "\n"
            "Incident: " + claim["party_b_incident_date"] + " at " + claim["party_b_incident_location"] + "\n"
            "Claimed value: " + claim["party_b_estimated_value"] + "\n"
            "Report: " + claim["party_b_incident_report"] + "\n"
            "Evidence: " + claim["party_b_evidence_description"] + "\n"
            "Q&A:\n" + b_qa_text + "\n\n"
            "Return ONLY valid JSON starting with { and ending with }. No markdown.\n"
            "Format:\n"
            '{"party_a_verdict": "CONSISTENT", "party_a_score": 82, '
            '"party_b_verdict": "REVIEW", "party_b_score": 61, '
            '"agreements": ["fact both parties agree on", "another agreement"], '
            '"contradictions": ["direct conflict between accounts", "another conflict"], '
            '"stronger_account": "PARTY_A", '
            '"recommendation": "REVIEW", '
            '"reasoning": "2-3 sentences on which account held up better and why"}\n'
            "party_a_verdict and party_b_verdict: CONSISTENT, REVIEW, or CONTRADICTORY\n"
            "stronger_account: PARTY_A, PARTY_B, or EQUAL\n"
            "recommendation: APPROVE_A (Party A more credible), APPROVE_B (Party B more credible), "
            "REVIEW (unclear), or DENY_BOTH (both accounts have serious issues)\n"
            "agreements and contradictions: specific factual points, not general observations"
        )

        def generate():
            return gl.nondet.exec_prompt(prompt)

        result_raw = gl.eq_principle.prompt_non_comparative(
            generate,
            task="adjudicate a two-party insurance dispute by comparing both accounts for internal consistency and identifying agreements and contradictions",
            criteria="valid JSON with party_a_verdict, party_b_verdict, scores, agreements array, contradictions array, stronger_account, recommendation, reasoning"
        )

        # Defensive parse for comparative verdict
        comp_verdict = {}
        try:
            start = result_raw.find("{")
            end   = result_raw.rfind("}") + 1
            if start >= 0 and end > start:
                parsed = json.loads(result_raw[start:end])

                def clean_verdict(v):
                    return v if v in ["CONSISTENT", "REVIEW", "CONTRADICTORY"] else "REVIEW"

                def clean_score(s):
                    try:
                        s = int(s)
                        return max(0, min(100, s))
                    except Exception:
                        return 50

                def clean_list(lst):
                    if not isinstance(lst, list): return []
                    return [str(x) for x in lst if x]

                stronger = parsed.get("stronger_account", "EQUAL")
                if stronger not in ["PARTY_A", "PARTY_B", "EQUAL"]:
                    stronger = "EQUAL"

                rec = parsed.get("recommendation", "REVIEW")
                if rec not in ["APPROVE_A", "APPROVE_B", "REVIEW", "DENY_BOTH"]:
                    rec = "REVIEW"

                comp_verdict = {
                    "party_a_verdict":  clean_verdict(parsed.get("party_a_verdict", "REVIEW")),
                    "party_a_score":    clean_score(parsed.get("party_a_score", 50)),
                    "party_b_verdict":  clean_verdict(parsed.get("party_b_verdict", "REVIEW")),
                    "party_b_score":    clean_score(parsed.get("party_b_score", 50)),
                    "agreements":       clean_list(parsed.get("agreements", [])),
                    "contradictions":   clean_list(parsed.get("contradictions", [])),
                    "stronger_account": stronger,
                    "recommendation":   rec,
                    "reasoning":        str(parsed.get("reasoning", "Manual adjuster review required."))
                }
        except Exception:
            comp_verdict = {}

        if not comp_verdict:
            comp_verdict = {
                "party_a_verdict":  "REVIEW",
                "party_a_score":    50,
                "party_b_verdict":  "REVIEW",
                "party_b_score":    50,
                "agreements":       [],
                "contradictions":   [],
                "stronger_account": "EQUAL",
                "recommendation":   "REVIEW",
                "reasoning":        "Automated comparative analysis could not be completed. Both accounts have been flagged for manual adjuster review."
            }

        claim["comparative_verdict"] = comp_verdict
        claim["status"]              = "completed"
        self._write_claim(claim_id, claim)

        # Update stats for both parties
        for address, name in [
            (claim["claimant_address"], claim["claimant_name"]),
            (claim["party_b_address"],  claim["party_b_name"])
        ]:
            if not address:
                continue
            stats = self._read_stats(address)
            stats["claims_submitted"] = stats.get("claims_submitted", 0) + 1
            stats["display_name"]     = name
            self._write_stats(address, stats)

        idx = int(self.recent_count)
        self.recent_claim_ids[u256(idx)] = claim_id
        self.recent_count = u256(idx + 1)

    # ----------------------------------------------------------------
    # finalise_uncontested
    # Called by Party A's frontend after 7 days with no Party B response.
    # Runs the single-party AI verdict on Party A's submission alone.
    # Status gate: party_a_complete only
    # ----------------------------------------------------------------
    @gl.public.write
    def finalise_uncontested(self, claim_id: str) -> None:
        claim = self._read_claim(claim_id)

        if claim["status"] != "party_a_complete":
            return
        if claim["claim_mode"] != "MULTI":
            return

        # Run single-party consistency check on Party A's submission
        questions = claim.get("questions", [])
        answers   = claim.get("answers", {})

        qa_lines = []
        for i, q in enumerate(questions):
            qa_lines.append("Q" + str(i + 1) + ": " + q)
            qa_lines.append("A" + str(i + 1) + ": " + answers.get(str(i), "No answer provided"))
        qa_text = "\n".join(qa_lines)

        prompt = (
            "You are a senior insurance claims adjuster. "
            "A claimant submitted a " + claim["claim_type"] + " claim through a two-party dispute process. "
            "The other party did not respond within the required window. "
            "Analyse the claimant's account for internal consistency across all four stages. "
            "This is an uncontested submission — assess it on its own merits.\n\n"
            "INCIDENT: " + claim["incident_date"] + " at " + claim["incident_location"] + "\n"
            "VALUE: " + claim["estimated_value"] + "\n"
            "REPORT: " + claim["incident_report"] + "\n"
            "EVIDENCE: " + claim["evidence_description"] + "\n"
            "Q&A:\n" + qa_text + "\n\n"
            "Return ONLY valid JSON:\n"
            '{"verdict": "CONSISTENT", "credibility_score": 80, '
            '"reasoning": "2-3 sentences", "flags": [], "recommendation": "APPROVE"}'
        )

        def generate():
            return gl.nondet.exec_prompt(prompt)

        result_raw = gl.eq_principle.prompt_non_comparative(
            generate,
            task="assess an uncontested insurance claim for internal consistency",
            criteria="valid JSON with verdict, credibility_score, reasoning, flags, recommendation"
        )

        verdict_data = self._parse_verdict(
            result_raw,
            "Uncontested claim. The other party did not respond. Manual review recommended."
        )

        claim["verdict"] = verdict_data
        claim["status"]  = "uncontested"
        self._write_claim(claim_id, claim)

        # Update Party A stats
        stats = self._read_stats(claim["claimant_address"])
        stats["claims_submitted"] = stats.get("claims_submitted", 0) + 1
        stats["display_name"]     = claim["claimant_name"]
        self._write_stats(claim["claimant_address"], stats)

        idx = int(self.recent_count)
        self.recent_claim_ids[u256(idx)] = claim_id
        self.recent_count = u256(idx + 1)

    @gl.public.write
    def finalize_claim(self, claim_id: str) -> None:
        # Empty pass — ABI completeness
        pass

    # ================================================================
    # PUBLIC VIEW METHODS
    # ================================================================

    @gl.public.view
    def get_claim(self, claim_id: str) -> str:
        if claim_id not in self.claims:
            return json.dumps({"error": "Claim not found"})
        return self.claims[claim_id]

    @gl.public.view
    def get_claim_by_respondent_code(self, respondent_code: str) -> str:
        """
        Used by Party B join screen to preview the claim before joining.
        Returns the claim with party_b sensitive fields stripped —
        Party B can see the claim type and Party A's name but not their submission.
        """
        claim_id = self.respondent_codes.get(respondent_code)
        if claim_id is None:
            return json.dumps({"error": "Code not found"})

        claim_json = self.claims.get(claim_id)
        if claim_json is None:
            return json.dumps({"error": "Claim not found"})

        claim = json.loads(claim_json)

        # Return only safe preview fields — Party B cannot see Party A's submission
        preview = {
            "claim_id":         claim["claim_id"],
            "claim_type":       claim["claim_type"],
            "claim_mode":       claim["claim_mode"],
            "claimant_name":    claim["claimant_name"],
            "incident_date":    claim["incident_date"],
            "incident_location":claim["incident_location"],
            "status":           claim["status"],
            "party_b_address":  claim.get("party_b_address", ""),
        }
        return json.dumps(preview)

    @gl.public.view
    def get_claimant_stats(self, address: str) -> str:
        raw = self.claimant_stats.get(address)
        if raw is None:
            return json.dumps({
                "claims_submitted": 0,
                "consistent_claims": 0,
                "review_claims": 0,
                "contradictory_claims": 0,
                "display_name": ""
            })
        return raw

    @gl.public.view
    def get_recent_claims(self) -> str:
        """Last 20 completed claims — debug only."""
        recent = []
        total  = int(self.recent_count)
        start  = max(0, total - 20)
        for i in range(start, total):
            cid = self.recent_claim_ids.get(u256(i))
            if cid is None: continue
            claim_json = self.claims.get(cid)
            if claim_json is None: continue
            claim = json.loads(claim_json)
            verdict = claim.get("verdict", {})
            comp    = claim.get("comparative_verdict", {})
            recent.append({
                "claim_id":         cid,
                "claim_mode":       claim.get("claim_mode", "SINGLE"),
                "claim_type":       claim.get("claim_type", ""),
                "claimant_name":    claim.get("claimant_name", ""),
                "status":           claim.get("status", ""),
                "verdict":          verdict.get("verdict", "") if verdict else "",
                "credibility_score":verdict.get("credibility_score", 0) if verdict else 0,
                "stronger_account": comp.get("stronger_account", "") if comp else ""
            })
        return json.dumps(recent)
