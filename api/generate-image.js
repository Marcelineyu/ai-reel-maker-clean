const {
  parseJsonBody,
  requirePost,
  requireString,
  validateAnchorImages,
  withTimeout,
  handleApiError,
  sendError,
  ALLOWED_IMAGE_MODELS,
} = require('./_lib/validation');
const { generateImageWithGemini, MODELS } = require('./_lib/gemini');
const { hasOpenAIKey, generateImage: generateImageOpenAI } = require('./_lib/openai');

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  const descriptionCheck = requireString(parsed.data.description, 'description');
  if (!descriptionCheck.ok) return sendError(res, 400, descriptionCheck.error);

  const anchorCheck = validateAnchorImages(parsed.data.anchorImages);
  if (!anchorCheck.ok) return sendError(res, 400, anchorCheck.error);

  const modelId = parsed.data.modelId || MODELS.image;
  if (!ALLOWED_IMAGE_MODELS.has(modelId)) {
    return sendError(res, 400, 'Invalid or unsupported image model');
  }

  try {
    if (modelId === 'dall-e-3') {
      if (!hasOpenAIKey()) {
        return sendError(res, 503, 'OpenAI is not configured on the server');
      }
      const image = await withTimeout(generateImageOpenAI(descriptionCheck.value));
      return res.status(200).json({ image });
    }

    const image = await withTimeout(
      generateImageWithGemini(descriptionCheck.value, anchorCheck.value, modelId)
    );
    return res.status(200).json({ image });
  } catch (err) {
    return handleApiError(res, err, 'generate-image');
  }
};
