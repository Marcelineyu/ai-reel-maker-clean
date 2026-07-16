const {
  parseJsonBody,
  requirePost,
  withTimeout,
  handleApiError,
  sendError,
  MAX_TEXT_LENGTH,
} = require('./_lib/validation');
const { getGeminiClient, MODELS } = require('./_lib/gemini');
const { generateYouTubeTitle: generateYouTubeTitleOpenAI } = require('./_lib/openai');
const { preferOpenAIForText } = require('./_lib/providers');

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  const scriptContext = typeof parsed.data.scriptContext === 'string'
    ? parsed.data.scriptContext.slice(0, MAX_TEXT_LENGTH)
    : '';
  const anchorImagesInfo = typeof parsed.data.anchorImagesInfo === 'string'
    ? parsed.data.anchorImagesInfo.slice(0, 2000)
    : '';

  try {
    if (preferOpenAIForText()) {
      const title = await withTimeout(
        generateYouTubeTitleOpenAI(scriptContext, anchorImagesInfo)
      );
      return res.status(200).json({ title });
    }

    const ai = await withTimeout(getGeminiClient());
    const prompt = `Based on this video script, generate a catchy YouTube title. Maximum ~70 characters. Return ONLY the title, no quotes or explanation.

${anchorImagesInfo ? `Anchor images: ${anchorImagesInfo}\n\n` : ''}Script:
${scriptContext || '(No script yet)'}`;

    const response = await withTimeout(ai.models.generateContent({
      model: MODELS.text,
      contents: [{ parts: [{ text: prompt }] }],
    }));

    const title = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!title) return sendError(res, 422, 'No title from AI');

    return res.status(200).json({ title: title.slice(0, 100) });
  } catch (err) {
    return handleApiError(res, err, 'generate-youtube-title');
  }
};
