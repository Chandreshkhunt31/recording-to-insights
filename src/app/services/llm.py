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

- Use complete sentences and short paragraphs where appropriate for clarity and client readability.

- Do not over-summarize; prioritize meaning over detail.

- When uncertain, soften language (e.g., “appeared to,” “seemed to,” “may have”).

You must follow the output structure and output format exactly as defined in the user instructions.
"""


USER_PROMPT_TEMPLATE = """You are given a verbatim transcript from a recorded relationship session.

Your task is to generate a structured deliverable titled:

“Session Insight & Relationship Pattern Summary”

The output will be shown directly to clients inside a professional, enterprise-grade dashboard.
Clarity, readability, and visual structure are critical.

Use ONLY the information present in the transcript.
Do NOT infer facts, histories, diagnoses, or intentions not supported by the conversation.

==============================

TRANSCRIPT

==============================

{{FULL_SESSION_TRANSCRIPT}}

==============================

CRITICAL FORMATTING & PRESENTATION REQUIREMENTS (VERY IMPORTANT):

- Use clear section headers exactly as specified below.
- Ensure generous spacing between sections (logical paragraph breaks).
- Prefer short paragraphs (2–4 lines max).
- Use **bold text** selectively to highlight key phrases or concepts (represented as plain text).
- Use bullet points only where they improve clarity.
- Avoid dense blocks of text.
- Use **formal, minimal emojis** sparingly to guide the reader (e.g., 🧭 🔍 💬 ✨ ❓).
- Emojis must support clarity, not decoration.
- Tone must remain professional, grounded, and client-safe.
- Do NOT include meta commentary, explanations, or instructions in the content.

The output must feel:
- grounded
- reflective
- respectful
- easy to read on screen

--------------------------------

Generate the output using the following structure EXACTLY.
Do not rename sections.
Do not reorder sections.
Do not add or remove sections.

OUTPUT FORMAT REQUIREMENT (CRITICAL):

- Output MUST be valid JSON only (no markdown, no extra text).
- Use the keys EXACTLY as specified.
- Each value MUST be an array of strings.
  - For the first four sections, each string should be a short paragraph (2–4 lines max).
  - For reflective questions, each string should be a single question (no numbering).

Return this exact JSON schema:

{
  "session_overview": ["..."],
  "core_relationship_dynamics_observed": ["..."],
  "expressed_needs_and_concerns_as_heard": ["..."],
  "moments_of_alignment_understanding_or_repair": ["..."],
  "reflective_questions_for_consideration": ["...", "...", "..."]
}

CONTENT REQUIREMENTS:

- Use ONLY the transcript.
- No diagnoses, no blame, no therapy jargon unless clearly implied.
- Keep language safe to show directly to clients.
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
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        text = (resp.choices[0].message.content or "").strip()
        parsed = _try_parse_json(text)
        return LLMResult(
            raw_text=text,
            parsed_json=parsed,
            provider="openai",
            model=settings.openai_chat_model,
        )

    stub = {
        "session_overview": ["Stub mode: configure OPENAI_API_KEY for real insights."],
        "core_relationship_dynamics_observed": ["Stub mode."],
        "expressed_needs_and_concerns_as_heard": ["Stub mode."],
        "moments_of_alignment_understanding_or_repair": ["Stub mode."],
        "reflective_questions_for_consideration": [
            "What felt most important in this session?",
            "What patterns did you notice in how you each responded?",
            "What felt different by the end of the session, if anything?",
        ],
    }
    return LLMResult(
        raw_text=json.dumps(stub, ensure_ascii=False),
        parsed_json=stub,
        provider="stub",
        model="stub",
    )


def _try_parse_json(text: str) -> dict[str, Any] | None:
    try:
        val = json.loads(text)
        if isinstance(val, dict):
            required = [
                "session_overview",
                "core_relationship_dynamics_observed",
                "expressed_needs_and_concerns_as_heard",
                "moments_of_alignment_understanding_or_repair",
                "reflective_questions_for_consideration",
            ]
            if all(k in val for k in required):
                return val
            return val
    except Exception:
        return None
    return None


