import { postJson, serializeAnchorImages, base64ToBlob } from './apiClient';

export const GEMINI_TTS_VOICES = [
  { id: 'Aoede', name: 'Aoede', tone: 'Breezy, conversational, and intelligent', gender: 'Female' },
  { id: 'Callirrhoe', name: 'Callirrhoe', tone: 'Easy-going, clear, and articulate', gender: 'Female' },
  { id: 'Charon', name: 'Charon', tone: 'Informative, calm, and assured', gender: 'Male' },
  { id: 'Fenrir', name: 'Fenrir', tone: 'Excitable, warm, and approachable', gender: 'Male' },
  { id: 'Kore', name: 'Kore', tone: 'Firm, neutral, and professional', gender: 'Female' },
  { id: 'Leda', name: 'Leda', tone: 'Youthful, professional, and composed', gender: 'Female' },
  { id: 'Orus', name: 'Orus', tone: 'Firm, mature, and resonant', gender: 'Male' },
  { id: 'Puck', name: 'Puck', tone: 'Upbeat, friendly, and energetic (Default)', gender: 'Male' },
  { id: 'Zephyr', name: 'Zephyr', tone: 'Bright, perky, and enthusiastic', gender: 'Female' },
];

export function getImageModels(providers = {}) {
  return [
    ...(providers.openai ? [{ id: 'dall-e-3', label: 'DALL-E 3' }] : []),
    ...(providers.gemini ? [
      { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
      { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image' },
    ] : []),
  ];
}

export async function fetchProviders() {
  return postJson('/api/providers', {});
}

export async function generateScenes(movieIdea) {
  const data = await postJson('/api/generate-scenes', { movieIdea: movieIdea.trim() });
  return data.scenes;
}

export async function generateImage(description, anchorImages = [], modelId = 'gemini-2.5-flash-image') {
  const serializedAnchors = await serializeAnchorImages(anchorImages);
  const data = await postJson('/api/generate-image', {
    description,
    anchorImages: serializedAnchors,
    modelId,
  });

  return base64ToBlob(data.image.data, data.image.mimeType || 'image/png');
}

export async function generateTTSGemini(text, voice = 'Kore') {
  const validIds = GEMINI_TTS_VOICES.map((item) => item.id);
  const voiceName = validIds.includes(voice) ? voice : 'Kore';
  const data = await postJson('/api/generate-narration', {
    text,
    voice: voiceName,
    provider: 'gemini',
  });
  return base64ToBlob(data.audio.data, data.audio.mimeType || 'audio/wav');
}

export async function fetchElevenLabsVoices() {
  const data = await postJson('/api/elevenlabs-voices', {});
  return data.voices;
}

export async function generateTTSElevenLabs(text, voiceId) {
  if (!voiceId) throw new Error('Select an ElevenLabs voice');
  const data = await postJson('/api/generate-narration', {
    text,
    voice: voiceId,
    provider: 'elevenlabs',
  });
  return base64ToBlob(data.audio.data, data.audio.mimeType || 'audio/mpeg');
}

export async function generateTTSOpenAI(text, voice = 'alloy') {
  const data = await postJson('/api/generate-narration', {
    text,
    voice,
    provider: 'openai',
  });
  return base64ToBlob(data.audio.data, data.audio.mimeType || 'audio/mpeg');
}

export function translateWithTimeout(text, targetLanguage, timeoutMs = 20000) {
  return Promise.race([
    translateText(text, targetLanguage),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Translation timeout')), timeoutMs)
    ),
  ]);
}

export async function translateText(text, targetLanguage) {
  if (!text?.trim()) return '';
  const data = await postJson('/api/translate', { text, targetLanguage });
  return data.translated;
}

export async function generateYouTubeTitle(scriptContext, anchorImagesInfo) {
  const data = await postJson('/api/generate-youtube-title', {
    scriptContext,
    anchorImagesInfo,
  });
  return data.title;
}

export async function generateYouTubeDescription(scriptContext, anchorImagesInfo) {
  const data = await postJson('/api/generate-youtube-description', {
    scriptContext,
    anchorImagesInfo,
  });
  return data.description;
}

export async function generateYouTubeThumbnail(scriptContext, anchorImagesInfo, anchorImages = [], modelOption = 'cheap') {
  const prompt = `Create a striking YouTube thumbnail for a vertical short-form video (9:16). The video content:

${anchorImagesInfo ? `Reference/style images: ${anchorImagesInfo}\n\n` : ''}Script:
${scriptContext || '(No script yet)'}

Make the thumbnail eye-catching, modern, and suitable for YouTube Shorts. Bold visuals, clear focal point.`;

  const serializedAnchors = await serializeAnchorImages(anchorImages);
  const data = await postJson('/api/generate-thumbnail', {
    prompt,
    anchorImages: serializedAnchors,
    modelOption,
  });

  if (data.imageUrl) {
    return data.imageUrl;
  }

  return base64ToBlob(data.image.data, data.image.mimeType || 'image/png');
}

export async function generateTTS(text, provider = 'gemini', voice = 'Kore') {
  if (provider === 'openai') return generateTTSOpenAI(text, voice);
  if (provider === 'elevenlabs') return generateTTSElevenLabs(text, voice);
  return generateTTSGemini(text, voice);
}
