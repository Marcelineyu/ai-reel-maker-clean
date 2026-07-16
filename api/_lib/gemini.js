const MODELS = {
  text: 'gemini-2.5-flash',
  image: 'gemini-2.5-flash-image',
  tts: 'gemini-2.5-flash-preview-tts',
};

let aiClient = null;

async function getGeminiClient() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Gemini API key not configured on server');
  }
  if (!aiClient) {
    const { GoogleGenAI } = await import('@google/genai');
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

function parseScenesFromText(text) {
  if (!text?.trim()) return null;
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function extractImageFromResponse(data) {
  const genImg = data?.generatedImages?.[0]?.image;
  const imgB64 = genImg?.imageBytes ?? genImg?.image_bytes;
  if (imgB64) {
    return {
      data: imgB64,
      mimeType: genImg?.mimeType ?? genImg?.mime_type ?? 'image/png',
    };
  }

  const partsOut = data?.candidates?.[0]?.content?.parts ?? [];
  for (const part of partsOut) {
    const blob = part?.inlineData ?? part?.inline_data;
    const b64 = blob?.data;
    if (b64) {
      return {
        data: b64,
        mimeType: blob?.mimeType ?? blob?.mime_type ?? 'image/png',
      };
    }
  }

  const topB64 = data?.data?.[0]?.b64_json
    ?? data?.data?.[0]?.inlineData?.data
    ?? data?.data?.[0]?.inline_data?.data;
  if (topB64) {
    return { data: topB64, mimeType: 'image/png' };
  }

  const feedback = data?.promptFeedback;
  if (feedback?.blockReason) {
    throw new Error(`Image generation blocked: ${feedback.blockReason}. Try a different prompt.`);
  }
  if (data?.candidates?.length === 0) {
    const reason = feedback?.blockReasonMessage || 'No candidates returned';
    throw new Error(`Image generation failed: ${reason}`);
  }

  throw new Error('No image in response');
}

function pcmToWavBase64(pcmBuffer, sampleRate = 24000, numChannels = 1) {
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]).toString('base64');
}

function buildFullScript(scenes) {
  if (!Array.isArray(scenes) || scenes.length === 0) return '';
  return scenes
    .map((scene, index) => {
      const num = scene.sceneNumber ?? index + 1;
      const description = scene.description || '';
      const narration = scene.narration || '';
      return `Scene ${num}:\nDescription: ${description}\nNarration: ${narration}`;
    })
    .join('\n\n');
}

function buildImageParts(description, anchorImages = []) {
  const refs = [];
  const desc = (description || '').toLowerCase();
  if (desc.includes('image 1') && anchorImages[0]) refs.push(1);
  if (desc.includes('image 2') && anchorImages[1]) refs.push(2);
  if (desc.includes('image 3') && anchorImages[2]) refs.push(3);

  const parts = [];
  const promptPrefix = refs.length > 0
    ? 'Generate an image based on this description. Reference images are provided below in order as image 1, image 2, image 3. Use them according to the description.\n\nDescription: '
    : '';
  parts.push({ text: promptPrefix + description });

  for (const n of refs) {
    const img = anchorImages[n - 1];
    if (!img?.data) continue;
    parts.push({
      inlineData: {
        mimeType: img.mimeType || 'image/png',
        data: img.data,
      },
    });
  }

  return [{ role: 'user', parts }];
}

async function generateImageWithGemini(description, anchorImages = [], modelId = MODELS.image) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Gemini API key not configured on server');

  const contents = buildImageParts(description, anchorImages);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents,
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini image API error: ${res.status}`);
  }

  const data = await res.json();
  return extractImageFromResponse(data);
}

module.exports = {
  MODELS,
  getGeminiClient,
  parseScenesFromText,
  extractImageFromResponse,
  pcmToWavBase64,
  buildFullScript,
  buildImageParts,
  generateImageWithGemini,
};
