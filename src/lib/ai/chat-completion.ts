export type ChatRole = "system" | "user" | "assistant"

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }

export type ChatMessage = { role: ChatRole; content: string | ContentPart[] }

export type CompleteChatResult = {
  content: string
  /** True when no provider key is set or the API failed (fallback text still returned). */
  mock: boolean
  /** Model id used when live */
  model?: string
  warning?: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

type OpenAICompatResponse = {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

type Provider = "openrouter" | "openai" | "gemini"

function detectProvider(): Provider | null {
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter"
  if (process.env.OPENAI_API_KEY?.trim()) return "openai"
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini"
  return null
}

export function isAiProviderConfigured(): boolean {
  return detectProvider() !== null
}

function providerConfig(provider: Provider): { url: string; key: string; model: string; headers?: Record<string, string> } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"

  if (provider === "openrouter") {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY!,
      model: process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini",
      headers: { "HTTP-Referer": appUrl, "X-Title": "Clars AI CRM" },
    }
  }
  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY!,
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    }
  }
  // Gemini — uses Google's OpenAI-compatible endpoint
  return {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    key: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
  }
}

function demoChatReply(lastUser: string): string {
  const t = lastUser.toLowerCase()
  if (t.includes("invoice") || t.includes("facture")) {
    return (
      "**Demo mode** — add a `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `OPENROUTER_API_KEY` in `.env` for live answers.\n\n" +
      "Tip: Use **Finance → Invoices** to create documents, record payments, and filter by status. " +
      "Overdue items also surface under **Smart Insights**."
    )
  }
  if (t.includes("contact") || t.includes("client") || t.includes("lead")) {
    return (
      "**Demo mode** — configure an AI API key to get live answers.\n\n" +
      "Tip: **Contacts** holds your pipeline; log **interactions** on a contact's page so activity appears in the **Activity feed**."
    )
  }
  return (
    "**Demo mode** — add `GEMINI_API_KEY` (Google Gemini), `OPENAI_API_KEY` (OpenAI), or `OPENROUTER_API_KEY` (OpenRouter) to `.env`, then restart the dev server.\n\n" +
    "I can help with CRM workflows, email drafts, and report outlines once connected. What would you like to do?"
  )
}

/**
 * Chat completion — supports Gemini (via OpenAI-compatible endpoint), OpenAI, and OpenRouter.
 * Provider priority: OpenRouter → OpenAI → Gemini.
 */
export async function completeChat(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<CompleteChatResult> {
  const provider = detectProvider()
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? ""
  const lastUser = typeof lastUserMsg === "string" ? lastUserMsg : lastUserMsg.find((p) => p.type === "text")?.text ?? ""

  if (!provider) {
    return { content: demoChatReply(lastUser), mock: true, warning: "No AI provider configured. Using offline tips." }
  }

  const { url, key, model, headers: extraHeaders } = providerConfig(provider)
  const maxTokens = Math.min(4096, Math.max(256, options?.maxTokens ?? 1200))
  const temperature = options?.temperature ?? 0.7

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...extraHeaders,
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
    })

    const json = (await res.json()) as OpenAICompatResponse
    if (!res.ok) {
      const msg = json.error?.message || res.statusText
      return { content: demoChatReply(lastUser), mock: true, warning: `AI request failed (${res.status}): ${msg}` }
    }

    const content = json.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return { content: demoChatReply(lastUser), mock: true, warning: "Empty response from model." }
    }

    const u = json.usage
    const usage =
      u && (u.prompt_tokens != null || u.completion_tokens != null || u.total_tokens != null)
        ? {
            promptTokens: u.prompt_tokens,
            completionTokens: u.completion_tokens,
            totalTokens: u.total_tokens,
          }
        : undefined

    return { content, mock: false, model, usage }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return { content: demoChatReply(lastUser), mock: true, warning: `Network error: ${msg}` }
  }
}
