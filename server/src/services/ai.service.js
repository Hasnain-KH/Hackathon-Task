import { apiKey, baseUrl, model } from '../config/ai.js';

function safeProviderError(statusCode) {
  if (statusCode === 429) return 'The AI provider is temporarily busy. Please try again shortly.';
  return 'The AI provider could not complete this request.';
}

export async function chatOnce({ messages, tools, timeoutMs = 15000 }) {
  if (!apiKey) return { ok: false, status: 'provider_unavailable', error: 'AI assistant is not configured.' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        ...(tools?.length ? { tools, tool_choice: 'auto' } : {}),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        ok: false,
        status: 'provider_unavailable',
        error: safeProviderError(response.status),
      };
    }
    const result = await response.json();
    const choice = result.choices?.[0];
    if (!choice?.message) return { ok: false, status: 'error', error: 'The AI provider returned an invalid response.' };
    return {
      ok: true,
      message: choice.message,
      usage: {
        tokensIn: Number(result.usage?.prompt_tokens) || 0,
        tokensOut: Number(result.usage?.completion_tokens) || 0,
      },
    };
  } catch (error) {
    if (error.name === 'AbortError') return { ok: false, status: 'timeout', error: 'AI took too long. Please try again.' };
    return { ok: false, status: 'provider_unavailable', error: 'The AI provider is unavailable. Please try again later.' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runWithTools({
  user,
  feature,
  systemPrompt,
  messages,
  toolDefinitions = [],
  toolHandlers = {},
  maxToolRounds = 3,
  timeoutMs = 15000,
}) {
  const conversation = [{ role: 'system', content: systemPrompt }, ...messages];
  const toolCalls = [];
  const started = Date.now();
  let tokensIn = 0;
  let tokensOut = 0;
  let lastText = '';

  for (let round = 0; round < maxToolRounds; round += 1) {
    const remaining = timeoutMs - (Date.now() - started);
    if (remaining <= 0) {
      return { ok: false, status: 'timeout', error: 'AI took too long. Please try again.', toolCalls, usage: { tokensIn, tokensOut } };
    }
    const result = await chatOnce({
      messages: conversation,
      tools: toolDefinitions,
      timeoutMs: remaining,
    });
    if (!result.ok) return { ...result, toolCalls, usage: { tokensIn, tokensOut } };
    tokensIn += result.usage.tokensIn;
    tokensOut += result.usage.tokensOut;
    const assistant = result.message;
    lastText = assistant.content || '';
    if (!assistant.tool_calls?.length) {
      return { ok: true, text: lastText, toolCalls, usage: { tokensIn, tokensOut } };
    }
    conversation.push(assistant);
    for (const call of assistant.tool_calls) {
      const startedAt = Date.now();
      const name = call.function?.name || '';
      let args = {};
      let output;
      let ok = false;
      let errorMsg = '';
      try {
        args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
        const handler = toolHandlers[name];
        if (!handler) throw new Error('This tool is not available for your role.');
        output = await handler(args, user);
        ok = true;
      } catch (error) {
        errorMsg = error.message || 'Tool request failed.';
        output = { error: errorMsg };
      }
      toolCalls.push({
        name,
        args,
        ok,
        errorMsg,
        durationMs: Date.now() - startedAt,
      });
      conversation.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(output ?? null),
      });
    }
    if (round === maxToolRounds - 1) {
      return { ok: true, text: lastText || 'I could not complete that request with the available information.', toolCalls, usage: { tokensIn, tokensOut } };
    }
  }

  return {
    ok: true,
    text: lastText || 'I could not complete that request with the available information.',
    toolCalls,
    usage: { tokensIn, tokensOut },
  };
}

export async function callWithRetry(fn, { retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (error.retryable === false) throw error;
    }
  }
  throw lastError;
}
