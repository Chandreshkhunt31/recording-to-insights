from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from openai import OpenAI

from ..core.config import settings


SYSTEM_PROMPT = """You are an AI Insight Generator embedded inside a secure relationship-practice platform.

Your role is to transform a recorded relationship session into a clear, grounded, and client-safe interpretive deliverable.

IMPORTANT CONSTRAINTS:

- You are NOT a therapist, counsellor, or diagnostician.

- Do NOT label, diagnose, pathologize, or assign blame.

- Do NOT introduce concepts that were not reasonably present in the conversation.

- Use neutral, respectful, non-judgmental language at all times.

- Avoid therapy jargon unless it is clearly implied by the speakers.

- The output must be suitable to be shared directly with clients.

CONTEXT:

- The input is a transcript from a relationship session involving one or more participants.

- The purpose is reflection, clarity, and pattern awareness — not advice or instruction.

- The practitioner owns the interpretive framework; you are executing it consistently.

OUTPUT GOAL:

Produce a structured “Session Insight & Relationship Pattern Summary” that helps clients:

- understand what was discussed

- recognize recurring interaction patterns

- reflect on expressed needs

- notice moments of alignment or repair

- engage thoughtfully with reflective questions

STYLE GUIDELINES:

- Write in calm, grounded, human language.

- Use complete sentences, short paragraphs, and clear section headers.

- Do not over-summarize; prioritize meaning over detail.

- When uncertain, soften language (e.g., “appeared to,” “seemed to,” “may have”).

You must follow the output structure exactly as defined in the user instructions.
"""


USER_PROMPT_TEMPLATE = """You are given a verbatim transcript from a recorded relationship session.

Your task is to generate a structured deliverable titled:

“Session Insight & Relationship Pattern Summary”

Use ONLY the information present in the transcript.  
Do NOT infer facts, histories, or intentions that are not supported by the conversation.

==============================
TRANSCRIPT
==============================

{{FULL_SESSION_TRANSCRIPT}}

==============================

Generate the output using the following structure:

---

### 1. Session Overview
Provide a brief, neutral overview of the main themes discussed in this session.
Focus on:
- the central topics
- the emotional tone
- how the conversation progressed overall
Avoid assigning fault or conclusions.

---

### 2. Core Relationship Dynamics Observed
Identify recurring interaction patterns or relational dynamics that appeared during the conversation.
These may include:
- cycles of misunderstanding
- differences in emotional expression
- moments where tension escalated or eased
Describe patterns carefully, without labels or judgment.

---

### 3. Expressed Needs and Concerns (As Heard)
Summarize the needs, concerns, or longings expressed by each participant, as they appeared in the session.
Guidelines:
- Reflect what was said or implied, not what “should” be felt
- Keep descriptions balanced and respectful
- If multiple participants are present, separate them clearly

---

### 4. Moments of Alignment, Understanding, or Repair
Highlight moments in the session where:
- understanding improved
- empathy was expressed
- communication softened
- perspectives shifted constructively
These moments may be brief but meaningful.

---

### 5. Reflective Questions for Consideration
Provide 3–5 open-ended reflective questions designed to help participants:
- think about what resonated
- notice patterns they recognize
- consider what felt different by the end of the session
Questions should invite reflection, not action or advice.

---

FINAL CHECK BEFORE RESPONDING:
- Is the language safe to share directly with clients?
- Does the output remain faithful to the transcript?
- Are all sections present and clearly written?

If yes, provide the final formatted output.
"""


@dataclass(frozen=True)
class LLMResult:
    raw_text: str
    parsed_json: dict[str, Any] | None
    provider: str
    model: str


def run_llm_on_transcript(transcript: str) -> LLMResult:
    """
    Generate insights from transcript using a hard-coded prompt.

    - If OPENAI_API_KEY is set: uses OpenAI Chat Completions.
    - Otherwise: returns a deterministic stub JSON.
    """
    prompt = USER_PROMPT_TEMPLATE.replace("{{FULL_SESSION_TRANSCRIPT}}", transcript)

    if settings.openai_api_key:
        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.chat.completions.create(
            model=settings.openai_chat_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        text = (resp.choices[0].message.content or "").strip()
        # Your prompt requests a formatted sectioned output, not JSON.
        parsed = None
        return LLMResult(
            raw_text=text,
            parsed_json=parsed,
            provider="openai",
            model=settings.openai_chat_model,
        )

    return LLMResult(
        raw_text=(
            "### 1. Session Overview\n"
            "Stub mode: configure OPENAI_API_KEY for real insights.\n\n"
            "### 2. Core Relationship Dynamics Observed\n"
            "Stub mode.\n\n"
            "### 3. Expressed Needs and Concerns (As Heard)\n"
            "Stub mode.\n\n"
            "### 4. Moments of Alignment, Understanding, or Repair\n"
            "Stub mode.\n\n"
            "### 5. Reflective Questions for Consideration\n"
            "- What felt most important in this session?\n"
        ),
        parsed_json=None,
        provider="stub",
        model="stub",
    )


def _try_parse_json(text: str) -> dict[str, Any] | None:
    try:
        val = json.loads(text)
        if isinstance(val, dict):
            return val
    except Exception:
        return None
    return None


