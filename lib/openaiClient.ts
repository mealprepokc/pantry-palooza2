export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'function';
  content: string;
};

export type ChatOptions = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

export type ChatResponse = any;

/**
 * Calls the Netlify serverless proxy at /api/openai to perform a chat completion
 * without exposing your OPENAI_API_KEY to the client.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const {
    model = 'gpt-4o-mini',
    temperature = 0.7,
    max_tokens,
  } = options;

  const resp = await fetch('/api/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      ...(typeof max_tokens === 'number' ? { max_tokens } : {}),
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenAI proxy error ${resp.status}: ${text}`);
  }

  return resp.json();
}
