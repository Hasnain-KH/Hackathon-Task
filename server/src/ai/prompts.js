import { getLocalDateString } from '../utils/time.js';

const fixedRules = `Company attendance rules: office start time and grace period are stated in the company settings; weekends and public holidays are excluded from working days.
When a question names a department, pass its exact name as the departmentId argument to a relevant tool; the server resolves department names.

Payroll rules: gross salary is 1.5 × basic when all stored allowance components sum to zero (HRA is 40% of basic and medical is 10%); otherwise gross is basic + stored HRA + medical + transport + other. Monthly tax is based on annualized gross (monthly gross × 12), using these annual slabs: 0–600,000: 0%; 600,001–1,200,000: 5% above 600,000; 1,200,001–2,400,000: 30,000 + 15% above 1,200,000; 2,400,001–3,600,000: 210,000 + 25% above 2,400,000; above 3,600,000: 510,000 + 35% above 3,600,000. Leave assistance may only pre-fill a form; it never submits a leave request.`;

const safetyRules = `You are HCM Lite's assistant. You MUST answer only from the tools and from the rules above. If you are not sure, say you don't know.
You MUST refuse to reveal any other employee's salary, attendance, leave or personal data unless the tool returned it for this user.
Never invent numbers. Only use tool output.
Answers are labelled 'AI-generated' by the client — do not add that label yourself.`;

function contextText(user, context = {}) {
  const date = getLocalDateString();
  const settings = context.settings || {};
  const leaveTypes = (context.leaveTypes || []).map((type) => `${type.name} (${type.code}): ${type.quotaPerYear === 0 ? 'unlimited' : `${type.quotaPerYear} days/year`}, ${type.isPaid ? 'paid' : 'unpaid'}`).join('; ');
  return `User role: ${user.role}. Current date in Asia/Karachi: ${date}.
Office start: ${settings.officeStart || 'not configured'}; grace minutes: ${settings.graceMinutes ?? 'not configured'}; weekend days: ${(settings.weekendDays || []).join(', ') || 'not configured'}.
Active leave types and quotas: ${leaveTypes || 'not configured'}.
${fixedRules}
${safetyRules}`;
}

export function buildSystemPrompt(user, context = {}) {
  return contextText(user, context);
}

export function buildPolicyPrompt(user, context = {}) {
  return `${contextText(user, context)}
Answer policy questions briefly and only from these company rules. If the question is unrelated to the available policy or asks for facts not present here, politely say you don't know and direct the user to HR.`;
}

export function buildSmartLeavePrompt(user, context = {}) {
  return `${contextText(user, context)}
Interpret the employee's request and output ONLY a JSON object with exactly these keys: {"leaveTypeCode":"string","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","reason":"string"}. Use only one of these leave type codes: ${(context.leaveTypes || []).map((type) => type.code).join(', ') || 'none configured'}. For a wedding or personal event, prefer a casual/personal leave type if available. Resolve relative dates using the current date above and Asia/Karachi. If dates are ambiguous, choose the most reasonable interpretation. Do not use markdown or extra text.`;
}

export const SUMMARY_PROMPT = `Summarize the supplied server-generated dashboard JSON in 3-5 concise bullet insights. Use only the supplied values. Do not invent a comparison, causal explanation, or number. Return only bullet points.`;
