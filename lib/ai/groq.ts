/**
 * The one place this project talks to Groq.
 *
 * MODEL CHOICE, AND WHY IT IS NOT LLAMA. The obvious pick was
 * `llama-3.3-70b-versatile`, and it was wrong: Groq moved it to an Enterprise
 * tier, so a Developer-plan key gets a refusal rather than an answer. The
 * generally available production models are the GPT-OSS pair, and 20B is the
 * right default here — a thousand tokens a second, and neither job on this
 * site (reading a CV into fields, answering questions about a cancer charity
 * from supplied facts) is a reasoning problem that needs the larger one.
 *
 * `GROQ_MODEL` overrides it, so switching does not need a deploy of new code —
 * and if Groq retires this one too, the fix is an environment variable rather
 * than a hunt through the codebase.
 */

export const DEFAULT_MODEL = "openai/gpt-oss-20b";

/** The bigger sibling, for anything that turns out to need it. */
export const LARGE_MODEL = "openai/gpt-oss-120b";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export type Msg = { role: "system" | "user" | "assistant"; content: string };

export type GroqOk = { ok: true; text: string };
export type GroqErr = { ok: false; error: string; retryable: boolean };

export function groqConfigured() {
  return !!process.env.GROQ_API_KEY;
}

export function model() {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

/**
 * One call, with the failure modes named.
 *
 * Every caller here is user-facing, so an error has to be something a person
 * can read. "Groq is rate-limiting us, try in a minute" is actionable; a
 * stringified fetch rejection is not.
 */
export async function groqChat({
  messages,
  json = false,
  maxTokens = 800,
  temperature = 0.2,
  timeoutMs = 25_000,
  modelId,
}: {
  messages: Msg[];
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  modelId?: string;
}): Promise<GroqOk | GroqErr> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return {
      ok: false,
      retryable: false,
      error: "No GROQ_API_KEY is set on this deployment.",
    };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId ?? model(),
        temperature,
        max_completion_tokens: maxTokens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");

      if (res.status === 401) {
        return { ok: false, retryable: false, error: "The Groq key was refused. It may have been rotated or revoked." };
      }
      if (res.status === 429) {
        return { ok: false, retryable: true, error: "Too many requests to Groq just now. Try again in a minute." };
      }
      /* The failure this project actually hit: a model that exists in the docs
         but not on this plan. Naming it saves an afternoon. */
      if (res.status === 404 || /model.*(not found|does not exist|decommissioned)/i.test(body)) {
        return {
          ok: false,
          retryable: false,
          error: `The model "${modelId ?? model()}" is not available on this Groq key. Set GROQ_MODEL to one your plan allows — openai/gpt-oss-20b is the usual choice.`,
        };
      }
      if (res.status >= 500) {
        return { ok: false, retryable: true, error: "Groq is having trouble. Try again shortly." };
      }
      return { ok: false, retryable: false, error: `Groq returned ${res.status}. ${body.slice(0, 160)}` };
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return { ok: false, retryable: true, error: "Groq returned an empty answer." };
    }
    return { ok: true, text: text.trim() };
  } catch (err: any) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      ok: false,
      retryable: true,
      error: timedOut ? "Groq took too long to answer." : "Could not reach Groq.",
    };
  }
}
