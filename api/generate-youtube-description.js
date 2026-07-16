const {
  parseJsonBody,
  requirePost,
  withTimeout,
  handleApiError,
  sendError,
  MAX_TEXT_LENGTH,
} = require('./_lib/validation');
const { getGeminiClient, MODELS } = require('./_lib/gemini');
const { generateYouTubeDescription: generateYouTubeDescriptionOpenAI } = require('./_lib/openai');
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
      const description = await withTimeout(
        generateYouTubeDescriptionOpenAI(scriptContext, anchorImagesInfo)
      );
      return res.status(200).json({ description });
    }

    const ai = await withTimeout(getGeminiClient());
    const prompt = `Based on this video script, generate a YouTube description. Include 2-3 short paragraphs summarizing the video, then 3-5 relevant hashtags at the end. Return ONLY the description text.

${anchorImagesInfo ? `Anchor images: ${anchorImagesInfo}\n\n` : ''}Script:
${scriptContext || '(No script yet)'}`;

    const response = await withTimeout(ai.models.generateContent({
      model: MODELS.text,
      contents: [{ parts: [{ text: prompt }] }],
    }));

    const description = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!description) return sendError(res, 422, 'No description from AI');

    return res.status(200).json({ description });
  } catch (err) {
    return handleApiError(res, err, 'generate-youtube-description');
  }
};
