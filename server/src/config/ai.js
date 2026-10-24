export const apiKey = process.env.AI_API_KEY;
export const baseUrl = (process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/').replace(/\/+$/, '');
export const model = process.env.AI_MODEL || 'gemini-2.0-flash';
export const isConfigured = Boolean(process.env.AI_API_KEY);

let warned = false;

export function warnAiConfiguration() {
  if (!isConfigured && !warned) {
    console.warn('AI assistant is not configured. Set AI_API_KEY to enable AI endpoints.');
    warned = true;
  }
}
