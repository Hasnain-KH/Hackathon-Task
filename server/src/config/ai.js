export const apiKey = process.env.AI_API_KEY || '';
export const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
export const model = process.env.AI_MODEL || 'gpt-4o-mini';
export const isConfigured = Boolean(apiKey);

let warned = false;

export function warnAiConfiguration() {
  if (!isConfigured && !warned) {
    console.warn('AI assistant is not configured. Set AI_API_KEY to enable AI endpoints.');
    warned = true;
  }
}
