const { hasOpenAIKey } = require('./openai');
const { hasElevenLabsKey } = require('./elevenlabs');

function hasGeminiKey() {
  return !!(process.env.GEMINI_API_KEY || '').trim();
}

function getAvailableProviders() {
  return {
    openai: hasOpenAIKey(),
    gemini: hasGeminiKey(),
    elevenlabs: hasElevenLabsKey(),
  };
}

function preferOpenAIForText() {
  return hasOpenAIKey();
}

module.exports = {
  hasGeminiKey,
  getAvailableProviders,
  preferOpenAIForText,
};
