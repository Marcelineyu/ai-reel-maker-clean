const fs = require('fs');
const path = require('path');

const MAX_TEXT_LENGTH = 50000;
const MAX_MOVIE_IDEA_LENGTH = 10000;
const MAX_NARRATION_LENGTH = 10000;
const MAX_ANCHOR_IMAGES = 3;
const MAX_IMAGE_BASE64_LENGTH = 7 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120000;

const ALLOWED_IMAGE_MODELS = new Set([
  'dall-e-3',
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
]);

const ALLOWED_TTS_VOICES = new Set([
  'Aoede', 'Callirrhoe', 'Charon', 'Fenrir', 'Kore', 'Leda', 'Orus', 'Puck', 'Zephyr',
]);

const ALLOWED_OPENAI_TTS_VOICES = new Set([
  'alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'fable', 'marin', 'nova', 'onyx', 'sage', 'shimmer', 'verse',
]);

const ALLOWED_TTS_PROVIDERS = new Set(['gemini', 'openai', 'elevenlabs']);

function parseJsonBody(req) {
  if (req.body == null || req.body === '') {
    return { ok: false, error: 'Request body is required' };
  }
  if (typeof req.body === 'object') {
    return { ok: true, data: req.body };
  }
  if (typeof req.body === 'string') {
    try {
      return { ok: true, data: JSON.parse(req.body) };
    } catch {
      return { ok: false, error: 'Invalid JSON body' };
    }
  }
  return { ok: false, error: 'Invalid request body' };
}

function requirePost(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return false;
  }
  return true;
}

function requireString(value, fieldName, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, error: `${fieldName} is required` };
  }
  if (value.length > maxLength) {
    return { ok: false, error: `${fieldName} exceeds maximum length of ${maxLength} characters` };
  }
  return { ok: true, value: value.trim() };
}

function validateAnchorImages(anchorImages) {
  if (anchorImages == null) return { ok: true, value: [] };
  if (!Array.isArray(anchorImages)) {
    return { ok: false, error: 'anchorImages must be an array' };
  }
  if (anchorImages.length > MAX_ANCHOR_IMAGES) {
    return { ok: false, error: `At most ${MAX_ANCHOR_IMAGES} anchor images are allowed` };
  }
  for (let i = 0; i < anchorImages.length; i++) {
    const img = anchorImages[i];
    if (img == null) continue;
    if (typeof img !== 'object') {
      return { ok: false, error: `anchorImages[${i}] must be an object or null` };
    }
    if (typeof img.data !== 'string' || !img.data) {
      return { ok: false, error: `anchorImages[${i}].data is required` };
    }
    if (img.data.length > MAX_IMAGE_BASE64_LENGTH) {
      return { ok: false, error: `anchorImages[${i}] exceeds maximum allowed size` };
    }
    if (img.mimeType && typeof img.mimeType !== 'string') {
      return { ok: false, error: `anchorImages[${i}].mimeType must be a string` };
    }
  }
  return { ok: true, value: anchorImages };
}

function withTimeout(promise, ms = REQUEST_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), ms);
    }),
  ]);
}

function loadPrompt(filename) {
  const promptPath = path.join(__dirname, 'prompts', filename);
  return fs.readFileSync(promptPath, 'utf8');
}

function sanitizeErrorMessage(err) {
  const message = err?.message || 'An unexpected error occurred';
  if (/AIza[\w-]+/i.test(message) || /sk-[a-zA-Z0-9]{10,}/i.test(message)) {
    return 'External API request failed';
  }
  if (/Bearer\s+/i.test(message) || /xi-api-key/i.test(message)) {
    return 'External API request failed';
  }
  if (/api[_-]?key/i.test(message)) {
    return 'Server configuration error';
  }
  return message.slice(0, 500);
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function handleApiError(res, err, context) {
  console.error(`[${context}]`, sanitizeErrorMessage(err));
  const message = sanitizeErrorMessage(err);
  const status = message.includes('timed out') ? 504
    : message.includes('not configured') ? 503
    : message.includes('blocked') || message.includes('No ') ? 422
    : 500;
  return sendError(res, status, message);
}

module.exports = {
  MAX_TEXT_LENGTH,
  MAX_MOVIE_IDEA_LENGTH,
  MAX_NARRATION_LENGTH,
  MAX_ANCHOR_IMAGES,
  ALLOWED_IMAGE_MODELS,
  ALLOWED_TTS_VOICES,
  ALLOWED_OPENAI_TTS_VOICES,
  ALLOWED_TTS_PROVIDERS,
  parseJsonBody,
  requirePost,
  requireString,
  validateAnchorImages,
  withTimeout,
  loadPrompt,
  sanitizeErrorMessage,
  sendError,
  handleApiError,
};
