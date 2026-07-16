const {
  parseJsonBody,
  requirePost,
  requireString,
  withTimeout,
  loadPrompt,
  handleApiError,
  sendError,
  MAX_MOVIE_IDEA_LENGTH,
} = require('./_lib/validation');
const { getGeminiClient, parseScenesFromText, MODELS } = require('./_lib/gemini');
const { generateScenes: generateScenesOpenAI } = require('./_lib/openai');
const { preferOpenAIForText } = require('./_lib/providers');

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  const movieIdeaCheck = requireString(parsed.data.movieIdea, 'movieIdea', MAX_MOVIE_IDEA_LENGTH);
  if (!movieIdeaCheck.ok) return sendError(res, 400, movieIdeaCheck.error);

  try {
    if (preferOpenAIForText()) {
      const scenes = await withTimeout(generateScenesOpenAI(movieIdeaCheck.value));
      return res.status(200).json({ scenes });
    }

    const ai = await withTimeout(getGeminiClient());
    const template = loadPrompt('prompt_script.txt');
    const prompt = template.replace(/\{\{MOVIE_IDEA\}\}/g, movieIdeaCheck.value);

    const response = await withTimeout(ai.models.generateContent({
      model: MODELS.text,
      contents: [{ parts: [{ text: prompt }] }],
    }));

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return sendError(res, 422, 'No response from AI');

    const scenes = parseScenesFromText(text);
    return res.status(200).json({ scenes });
  } catch (err) {
    return handleApiError(res, err, 'generate-scenes');
  }
};
