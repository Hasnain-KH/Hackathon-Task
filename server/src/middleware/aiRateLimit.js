import AppError from '../utils/errors.js';
import AiLog from '../models/AiLog.js';

const MAX_REQUESTS = 20;
const WINDOW_MS = 60 * 60 * 1000;
const requestsByUser = new Map();

function featureFromPath(path) {
  if (path.includes('summary')) return 'summary';
  if (path.includes('smart-leave')) return 'smart_leave';
  if (path.includes('policy')) return 'policy';
  return 'chat';
}

export default async function aiRateLimit(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next(new AppError(401, 'Authentication required.'));
  const now = Date.now();
  let window = requestsByUser.get(userId);
  if (!window || now - window.windowStart >= WINDOW_MS) {
    window = { count: 0, windowStart: now };
  }
  if (window.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - window.windowStart)) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    await AiLog.create({
      userId,
      role: req.user.role,
      feature: featureFromPath(req.path),
      status: 'rate_limited',
      error: 'AI rate limit reached.',
    });
    return next(new AppError(429, 'AI rate limit reached. Try again later.'));
  }
  window.count += 1;
  requestsByUser.set(userId, window);
  return next();
}
