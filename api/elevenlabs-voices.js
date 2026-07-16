const {
  requirePost,
  withTimeout,
  handleApiError,
} = require('./_lib/validation');
const { hasElevenLabsKey, fetchVoices } = require('./_lib/elevenlabs');

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;

  if (!hasElevenLabsKey()) {
    return res.status(503).json({ error: 'ElevenLabs is not configured on the server' });
  }

  try {
    const voices = await withTimeout(fetchVoices());
    return res.status(200).json({ voices });
  } catch (err) {
    return handleApiError(res, err, 'elevenlabs-voices');
  }
};
