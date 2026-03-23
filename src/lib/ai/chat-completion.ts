export type ChatRole = "system" | "user" | "assistant"

export type ChatMessage = { role: ChatRole; content: string }

export type CompleteChatResult = {
  content: string
  /** True when no provider key is set or the API failed (fallback text still returned). */
  mock: boolean
  /** Model id used when live, e.g. openai/gpt-4o-mini */
  model?: string
  warning?: string
}

type OpenAICompatResponse = {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

function hasProviderKey(): "openrouter" | "openai" | null {
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter"
  if (process.env.OPENAI_API_KEY?.trim()) return "openai"
  return null
}

/** True when OpenRouter or OpenAI key is set (live models available). */
export function isAiProviderConfigured(): boolean {
  return hasProviderKey() !== null
}

function demoChatReply(lastUser: string): string {
  const t = lastUser.toLowerCase()
  if (t.includes("invoice") || t.includes("facture")) {
    return (
      "**Demo mode** — add `OPENAI_API_KEY` or `OPENROUTER_API_KEY` for live answers.\n\n" +
      "Tip: Use **Finance → Invoices** to create documents, record payments, and filter by status. " +
      "Overdue items also surface under **Smart Insights**."
    )
  }
  if (t.includes("contact") || t.includes("client") || t.includes("lead")) {
    return (
      "**Demo mode** — configure an API key for full AI.\n\n" +
      "Tip: **Contacts** holds your pipeline; log **interactions** on a contact’s page so activity appears in the **Activity feed**."
    )
  }
  return (
    "**Demo mode** — set `OPENAI_API_KEY` (OpenAI) or `OPENROUTER_API_KEY` (OpenRouter) in `.env`, then restart the dev server.\n\n" +
    "I can help with CRM workflows, email drafts, and report outlines once connected. What would you like to do?"
  )
}

/**
 * OpenAI-compatible chat completion (OpenAI or OpenRouter).
 */
export async function completeChat(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<CompleteChatResult> {
  const provider = hasProviderKey()
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? ""

  if (!provider) {
    return {
      content: demoChatReply(lastUser),
      mock: true,
      warning: "No AI provider configured. Using offline tips.",
    }
  }

  const maxTokens = Math.min(4096, Math.max(256, options?.maxTokens ?? 1200))
  const temperature = options?.temperature ?? 0.7

  const url =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions"
  const key =
    provider === "openrouter" ? process.env.OPENROUTER_API_KEY! : process.env.OPENAI_API_KEY!

  const model =
    provider === "openrouter"
      ? process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini"
      : process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...(provider === "openrouter"
          ? {
              "HTTP-Referer": appUrl,
              "X-Title": "Clars AI CRM",
            }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    })

    const json = (await res.json()) as OpenAICompatResponse
    if (!res.ok) {
      const msg = json.error?.message || res.statusText
      return {
        content: demoChatReply(lastUser),
        mock: true,
        warning: `AI request failed (${res.status}): ${msg}`,
      }
    }

    const content = json.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return {
        content: demoChatReply(lastUser),
        mock: true,
        warning: "Empty response from model.",
      }
    }

    return { content, mock: false, model }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return {
      content: demoChatReply(lastUser),
      mock: true,
      warning: `Network error: ${msg}`,
    }
  }
}
