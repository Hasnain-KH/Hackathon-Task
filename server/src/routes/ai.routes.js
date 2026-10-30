import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireRole, verifyToken } from '../middleware/auth.js';
import AiLog from '../models/AiLog.js';
import CompanySettings from '../models/CompanySettings.js';
import LeaveType from '../models/LeaveType.js';
import User from '../models/User.js';
import aiRateLimit from '../middleware/aiRateLimit.js';
import { apiKey, baseUrl, isConfigured, model } from '../config/ai.js';
import { getToolDefinitions, getToolHandlers } from '../ai/tools.js';
import {
  buildPolicyPrompt, buildSmartLeavePrompt, buildSystemPrompt, SUMMARY_PROMPT,
} from '../ai/prompts.js';
import { dashboardService } from '../services/dashboard.service.js';
import { callWithRetry, chatOnce, runWithTools } from '../services/ai.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/errors.js';
import { sanitizeProviderErrorCode, sanitizeProviderErrorStatus } from '../utils/providerError.js';
import { resolveDateRange } from '../utils/dateRange.js';
import { getLocalDateString } from '../utils/time.js';

const router = Router();
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function redactSensitiveText(value = '', maxLength = 8000) {
  return value
    .replace(/(password|passwd|secret|token)\s*(?:is|[:=])\s*["']?[^\s,;"']+/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .slice(0, maxLength);
}

function safeUser(user, name) {
  return {
    id: user.id,
    role: user.role,
    employeeId: user.employeeRef || null,
    name: name || '',
  };
}

async function getPromptContext() {
  const [settings, leaveTypes] = await Promise.all([
    CompanySettings.getSingleton().lean(),
    LeaveType.find({ isActive: true }).select('name code quotaPerYear isPaid').lean(),
  ]);
  return { settings: settings || {}, leaveTypes };
}

async function getSafeUser(req) {
  const account = await User.findById(req.user.id).select('name').lean();
  return safeUser(req.user, account?.name);
}

async function logCall({ user, feature, prompt, response = '', toolCalls = [], usage = {}, latencyMs, status = 'ok', error = '' }) {
  return AiLog.create({
    userId: user.id,
    role: user.role,
    feature,
    prompt: redactSensitiveText(prompt, 4000),
    toolCalls: toolCalls.map((call) => ({
      name: String(call.name || '').slice(0, 100),
      args: call.args || {},
      ok: Boolean(call.ok),
      errorMsg: String(call.errorMsg || '').slice(0, 500),
      durationMs: Number(call.durationMs) || 0,
    })),
    response: redactSensitiveText(String(response || ''), 8000),
    model,
    tokensIn: Number(usage.tokensIn) || 0,
    tokensOut: Number(usage.tokensOut) || 0,
    latencyMs: Number(latencyMs) || 0,
    status,
    error: String(error || '').slice(0, 1000),
  });
}

function requireConfigured(req, res, next) {
  if (isConfigured) return next();
  const user = { id: req.user.id, role: req.user.role };
  logCall({
    user,
    feature: req.path.includes('summary') ? 'summary'
      : req.path.includes('smart-leave') ? 'smart_leave'
        : req.path.includes('policy') ? 'policy' : 'chat',
    status: 'provider_unavailable',
    error: 'AI assistant is not configured.',
  }).then(() => next(new AppError(503, 'AI assistant is unavailable until an API key is configured.', { expose: true })))
    .catch(next);
}

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed.',
      details: errors.array().map(({ path, msg }) => ({ field: path || '_body', msg })),
    });
  }
  return next();
}

function providerFailure(result) {
  if (result.status === 'timeout') return new AppError(504, 'AI took too long. Please try again.', { expose: true });
  if (result.status === 'provider_unavailable') return new AppError(503, result.error || 'AI provider is unavailable.', { expose: true });
  return new AppError(502, result.error || 'AI could not complete the request.', { expose: true });
}

function loggedStatus(result) {
  return result.status === 'timeout' ? 'timeout'
    : result.status === 'provider_unavailable' ? 'provider_unavailable' : 'error';
}

function isValidDate(value) {
  if (!isoDatePattern.test(value || '')) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseSmartLeave(raw, leaveTypes) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Response must be valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Response must be a JSON object.');
  const allowedKeys = ['endDate', 'leaveTypeCode', 'reason', 'startDate'];
  if (Object.keys(value).sort().join(',') !== allowedKeys.join(',')) throw new Error('Response must contain exactly the required keys.');
  const leaveType = leaveTypes.find((item) => item.code.toLowerCase() === String(value.leaveTypeCode || '').toLowerCase());
  if (!leaveType) throw new Error('leaveTypeCode must match an available leave type code.');
  if (!isValidDate(value.startDate) || !isValidDate(value.endDate) || value.startDate > value.endDate) {
    throw new Error('startDate and endDate must be valid ordered YYYY-MM-DD dates.');
  }
  if (typeof value.reason !== 'string' || !value.reason.trim()) throw new Error('reason must not be empty.');
  return {
    leaveTypeId: leaveType._id.toString(),
    leaveTypeName: leaveType.name,
    startDate: value.startDate,
    endDate: value.endDate,
    reason: value.reason.trim().slice(0, 500),
  };
}

function summaryBullets(text) {
  return String(text || '').split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

async function summaryData(feature, filters, user) {
  if (feature === 'employee') return dashboardService.getEmployeeDashboard(user.employeeId);
  const range = resolveDateRange(filters);
  const departmentId = filters.departmentId;
  const [headcount, attendance, lateComers, leave] = await Promise.all([
    dashboardService.getHeadcount({ asOfDate: range.to, departmentId }),
    dashboardService.getAttendanceSummary({ ...range, departmentId }),
    dashboardService.getLateComers({ ...range, departmentId, limit: 5 }),
    dashboardService.getLeaveSummary({ ...range, departmentId }),
  ]);
  const result = { headcount, attendance, lateComers, leave };
  if (feature === 'admin') {
    const [attrition, payroll] = await Promise.all([
      dashboardService.getAttrition({ ...range, departmentId }),
      dashboardService.getPayrollSummary({ ...range, departmentId }),
    ]);
    result.attrition = attrition;
    result.payroll = payroll;
  }
  return result;
}

router.post('/provider-diagnostic', verifyToken, requireRole('admin'), aiRateLimit, asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  let httpStatus = null;
  let providerErrorCode = null;
  let providerErrorStatus = null;
  const result = () => ({
    httpStatus,
    elapsedMs: Date.now() - startedAt,
    providerErrorCode,
    providerErrorStatus,
  });

  if (!apiKey) return res.status(503).json(result());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
      }),
      signal: controller.signal,
    });
    httpStatus = response.status;
    if (response.ok && response.body) {
      const reader = response.body.getReader();
      while (!(await reader.read()).done) {
        // Consume and discard the body so elapsedMs covers the full provider response.
      }
    } else if (!response.ok) {
      try {
        const payload = await response.json();
        const providerError = payload && typeof payload === 'object' && !Array.isArray(payload)
          ? payload.error
          : null;
        if (providerError && typeof providerError === 'object' && !Array.isArray(providerError)) {
          providerErrorCode = sanitizeProviderErrorCode(providerError.code ?? providerError.type);
          providerErrorStatus = sanitizeProviderErrorStatus(providerError.status);
        }
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
      }
    }
    return res.json(result());
  } catch (error) {
    return res.status(error?.name === 'AbortError' ? 504 : 502).json(result());
  } finally {
    clearTimeout(timeout);
  }
}));

router.use(verifyToken, aiRateLimit, requireConfigured);

router.post('/chat', [
  body('messages').isArray({ min: 1, max: 24 }).withMessage('Messages must be a non-empty array.'),
  body('messages.*.role').isIn(['user', 'assistant']).withMessage('Message role is invalid.'),
  body('messages.*.content').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters.'),
  body('messages').custom((messages) => Array.isArray(messages) && messages.at(-1)?.role === 'user').withMessage('The last message must be from the user.'),
  body('maxHistory').optional().isInt({ min: 1, max: 8 }).toInt(),
], validateRequest, asyncHandler(async (req, res) => {
  const started = Date.now();
  const user = await getSafeUser(req);
  const context = await getPromptContext();
  const maxHistory = Math.min(8, Number(req.body.maxHistory) || 8);
  const messages = req.body.messages.slice(-maxHistory);
  if (messages.at(-1)?.role !== 'user') throw new AppError(422, 'The last message must be from the user.');
  const result = await runWithTools({
    user,
    feature: 'chat',
    systemPrompt: buildSystemPrompt(user, context),
    messages,
    toolDefinitions: getToolDefinitions(user),
    toolHandlers: getToolHandlers(user),
    timeoutMs: 45000,
  });
  const latencyMs = Date.now() - started;
  if (!result.ok) {
    await logCall({
      user, feature: 'chat',
      prompt: messages.map(({ role, content }) => `${role}: ${content}`).join('\n'),
      toolCalls: result.toolCalls, usage: result.usage, latencyMs,
      status: loggedStatus(result), error: result.error,
    });
    throw providerFailure(result);
  }
  await logCall({
    user,
    feature: 'chat',
    prompt: messages.map(({ role, content }) => `${role}: ${content}`).join('\n'),
    response: result.text,
    toolCalls: result.toolCalls,
    usage: result.usage,
    latencyMs,
  });
  res.json({
    reply: result.text,
    toolCalls: result.toolCalls.map(({ name, ok, errorMsg, durationMs }) => ({ name, ok, errorMsg, durationMs })),
    aiGenerated: true,
    latencyMs,
  });
}));

router.post('/summary', [
  body('feature').isIn(['admin', 'hr', 'employee', 'custom']).withMessage('Feature is invalid.'),
  body('filters').optional().isObject().withMessage('Filters must be an object.'),
  body('filters.from').optional().custom(isValidDate).withMessage('From must be a valid YYYY-MM-DD date.'),
  body('filters.to').optional().custom(isValidDate).withMessage('To must be a valid YYYY-MM-DD date.'),
  body('filters.departmentId').optional().isMongoId().withMessage('Department id must be valid.'),
], validateRequest, asyncHandler(async (req, res) => {
  const user = await getSafeUser(req);
  const feature = req.body.feature === 'custom' ? (user.role === 'employee' ? 'employee' : 'hr') : req.body.feature;
  const allowed = feature === 'admin' ? user.role === 'admin'
    : feature === 'hr' ? ['admin', 'hr'].includes(user.role)
      : feature === 'employee' ? user.role === 'employee' : false;
  if (!allowed) throw new AppError(403, 'You cannot request this dashboard summary.');
  const started = Date.now();
  const filters = req.body.filters || {};
  const kpis = await summaryData(feature, filters, user);
  const result = await chatOnce({
    messages: [
      { role: 'system', content: `${buildSystemPrompt(user, await getPromptContext())}\n${SUMMARY_PROMPT}` },
      { role: 'user', content: JSON.stringify(kpis) },
    ],
    timeoutMs: 15000,
  });
  const latencyMs = Date.now() - started;
  if (!result.ok) {
    await logCall({
      user, feature: 'summary', prompt: JSON.stringify({ feature, filters }),
      usage: result.usage, latencyMs, status: loggedStatus(result), error: result.error,
    });
    throw providerFailure(result);
  }
  const bullets = summaryBullets(result.message.content);
  await logCall({
    user, feature: 'summary', prompt: JSON.stringify({ feature, filters }),
    response: result.message.content, usage: result.usage, latencyMs,
  });
  res.json({ bullets, aiGenerated: true });
}));

router.post('/smart-leave', [
  body('text').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Text must be between 1 and 2000 characters.'),
], validateRequest, asyncHandler(async (req, res) => {
  const user = await getSafeUser(req);
  if (user.role !== 'employee' || !user.employeeId) throw new AppError(403, 'Smart leave is available to employees only.');
  const started = Date.now();
  const [context, leaveTypes] = await Promise.all([
    getPromptContext(),
    LeaveType.find({ isActive: true }).select('name code').lean(),
  ]);
  const basePrompt = buildSmartLeavePrompt(user, context);
  let validationError = '';
  let lastResult;
  const usage = { tokensIn: 0, tokensOut: 0 };
  let form;
  try {
    form = await callWithRetry(async (attempt) => {
    const remainingMs = Math.max(1, 15000 - (Date.now() - started));
    const result = await chatOnce({
      messages: [
        { role: 'system', content: basePrompt },
        { role: 'user', content: req.body.text },
        ...(attempt ? [{ role: 'user', content: `Your prior output was invalid: ${validationError}. Return corrected JSON only.` }] : []),
      ],
      timeoutMs: remainingMs,
    });
    lastResult = result;
    usage.tokensIn += result.usage?.tokensIn || 0;
    usage.tokensOut += result.usage?.tokensOut || 0;
    if (!result.ok) {
      const failure = new Error(result.error);
      failure.retryable = false;
      throw failure;
    }
    try {
      return parseSmartLeave(result.message.content, leaveTypes);
    } catch (error) {
      validationError = error.message;
      throw error;
    }
    }, { retries: 1 });
  } catch {
    form = null;
  }
  const latencyMs = Date.now() - started;
  if (lastResult && !lastResult.ok) {
    await logCall({
    user, feature: 'smart_leave', prompt: req.body.text,
    usage, latencyMs, status: loggedStatus(lastResult),
    error: lastResult.error || 'AI did not return a valid leave form.',
    });
    throw providerFailure(lastResult);
  }
  if (!form) {
    await logCall({
    user, feature: 'smart_leave', prompt: req.body.text,
    response: lastResult?.message?.content, usage,
    latencyMs, status: 'error', error: validationError,
    });
    throw new AppError(422, 'Could not understand — please use the form.');
  }
  await logCall({
    user, feature: 'smart_leave', prompt: req.body.text,
    response: JSON.stringify(form), usage, latencyMs,
  });
  res.json({ form, aiGenerated: true });
}));

router.post('/policy', [
  body('question').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Question must be between 1 and 2000 characters.'),
], validateRequest, asyncHandler(async (req, res) => {
  const user = await getSafeUser(req);
  const started = Date.now();
  const context = await getPromptContext();
  const result = await chatOnce({
    messages: [
      { role: 'system', content: buildPolicyPrompt(user, context) },
      { role: 'user', content: req.body.question },
    ],
    timeoutMs: 15000,
  });
  const latencyMs = Date.now() - started;
  if (!result.ok) {
    await logCall({
      user, feature: 'policy', prompt: req.body.question,
      usage: result.usage, latencyMs, status: loggedStatus(result), error: result.error,
    });
    throw providerFailure(result);
  }
  await logCall({
    user, feature: 'policy', prompt: req.body.question,
    response: result.message.content, usage: result.usage, latencyMs,
  });
  res.json({ answer: result.message.content || 'I do not know based on the available company policy.', aiGenerated: true, isPolicyQa: true });
}));

export default router;
