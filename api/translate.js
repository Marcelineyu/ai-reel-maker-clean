const {
  parseJsonBody,
  requirePost,
  requireString,
  withTimeout,
  handleApiError,
  sendError,
  MAX_TEXT_LENGTH,
} = require('./_lib/validation');
const { getGeminiClient, MODELS } = require('./_lib/gemini');
const { translateText: translateTextOpenAI } = require('./_lib/openai');
const { preferOpenAIForText } = require('./_lib/providers');

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  const textCheck = requireString(parsed.data.text, 'text', MAX_TEXT_LENGTH);
  if (!textCheck.ok) return sendError(res, 400, textCheck.error);

  const languageCheck = requireString(parsed.data.targetLanguage, 'targetLanguage', 100);
  if (!languageCheck.ok) return sendError(res, 400, languageCheck.error);

  try {
    if (preferOpenAIForText()) {
      const translated = await withTimeout(
        translateTextOpenAI(textCheck.value, languageCheck.value)
      );
      return res.status(200).json({ translated });
    }

    const ai = await withTimeout(getGeminiClient());
    const prompt = `Translate the following narration text to ${languageCheck.value}. Preserve any emotional tags in square brackets (e.g. [excited], [whispering]) exactly as they appear. Return ONLY the translated text, no explanation or quotes.\n\nText to translate:\n${textCheck.value}`;

    const response = await withTimeout(ai.models.generateContent({
      model: MODELS.text,
      contents: [{ parts: [{ text: prompt }] }],
    }));

    const translated = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!translated) return sendError(res, 422, 'No translation from AI');

    return res.status(200).json({ translated });
  } catch (err) {
    return handleApiError(res, err, 'translate');
  }
};
