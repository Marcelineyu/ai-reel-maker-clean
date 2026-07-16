const {
  parseJsonBody,
  requirePost,
  requireString,
  validateAnchorImages,
  withTimeout,
  handleApiError,
  sendError,
  MAX_TEXT_LENGTH,
} = require('./_lib/validation');
const { generateImageWithGemini, MODELS } = require('./_lib/gemini');
const { hasOpenAIKey, generateThumbnailImage } = require('./_lib/openai');

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  const promptCheck = requireString(parsed.data.prompt, 'prompt', MAX_TEXT_LENGTH);
  if (!promptCheck.ok) return sendError(res, 400, promptCheck.error);

  const anchorCheck = validateAnchorImages(parsed.data.anchorImages);
  if (!anchorCheck.ok) return sendError(res, 400, anchorCheck.error);

  const modelOption = parsed.data.modelOption === 'expensive' ? 'expensive' : 'cheap';

  try {
    if (hasOpenAIKey()) {
      const quality = modelOption === 'expensive' ? 'hd' : 'standard';
      const result = await withTimeout(generateThumbnailImage(promptCheck.value, quality));
      if (result.imageUrl) {
        return res.status(200).json({ imageUrl: result.imageUrl });
      }
      return res.status(200).json({ image: result });
    }

    const modelId = modelOption === 'expensive' ? 'gemini-3-pro-image-preview' : MODELS.image;
    const image = await withTimeout(
      generateImageWithGemini(promptCheck.value, anchorCheck.value, modelId)
    );
    return res.status(200).json({ image });
  } catch (err) {
    return handleApiError(res, err, 'generate-thumbnail');
  }
};
