const {
  parseJsonBody,
  requirePost,
  requireString,
  withTimeout,
  handleApiError,
  sendError,
  ALLOWED_TTS_VOICES,
  ALLOWED_OPENAI_TTS_VOICES,
  ALLOWED_TTS_PROVIDERS,
  MAX_NARRATION_LENGTH,
} = require('./_lib/validation');
const { getGeminiClient, pcmToWavBase64, MODELS } = require('./_lib/gemini');
const { hasOpenAIKey, generateTTS: generateTTSOpenAI } = require('./_lib/openai');
const { hasElevenLabsKey, generateSpeech } = require('./_lib/elevenlabs');

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  const textCheck = requireString(parsed.data.text, 'text', MAX_NARRATION_LENGTH);
  if (!textCheck.ok) return sendError(res, 400, textCheck.error);

  const provider = parsed.data.provider || 'gemini';
  if (!ALLOWED_TTS_PROVIDERS.has(provider)) {
    return sendError(res, 400, 'Invalid TTS provider');
  }

  const voice = parsed.data.voice || (provider === 'openai' ? 'alloy' : 'Kore');

  try {
    if (provider === 'openai') {
      if (!hasOpenAIKey()) return sendError(res, 503, 'OpenAI is not configured on the server');
      if (!ALLOWED_OPENAI_TTS_VOICES.has(voice)) return sendError(res, 400, 'Invalid OpenAI voice selection');
      const audio = await withTimeout(generateTTSOpenAI(textCheck.value, voice));
      return res.status(200).json({ audio });
    }

    if (provider === 'elevenlabs') {
      if (!hasElevenLabsKey()) return sendError(res, 503, 'ElevenLabs is not configured on the server');
      if (!voice) return sendError(res, 400, 'ElevenLabs voice ID is required');
      const audio = await withTimeout(generateSpeech(textCheck.value, voice));
      return res.status(200).json({ audio });
    }

    if (!ALLOWED_TTS_VOICES.has(voice)) {
      return sendError(res, 400, 'Invalid Gemini voice selection');
    }

    const ai = await withTimeout(getGeminiClient());
    const response = await withTimeout(ai.models.generateContent({
      model: MODELS.tts,
      contents: [{ parts: [{ text: textCheck.value }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    }));

    const audioB64 = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioB64) return sendError(res, 422, 'No audio in response');

    const pcm = Buffer.from(audioB64, 'base64');
    const wavBase64 = pcmToWavBase64(pcm, 24000, 1);

    return res.status(200).json({
      audio: {
        data: wavBase64,
        mimeType: 'audio/wav',
      },
    });
  } catch (err) {
    return handleApiError(res, err, 'generate-narration');
  }
};
