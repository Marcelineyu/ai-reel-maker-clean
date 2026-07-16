function getOpenAIKey() {
  return (process.env.OPENAI_API_KEY || '').trim();
}

function getOpenAIModel() {
  return (process.env.OPENAI_MODEL || 'gpt-4o').trim();
}

function hasOpenAIKey() {
  return !!getOpenAIKey();
}

async function openaiFetch(path, body) {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error('OpenAI API key not configured on server');

  const res = await fetch(`https://api.openai.com/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  return res.json();
}

async function openaiBinaryFetch(path, body) {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error('OpenAI API key not configured on server');

  const res = await fetch(`https://api.openai.com/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenAI TTS error: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.toString('base64');
}

function parseScenesFromText(text) {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function tryParseScriptFromText(text) {
  if (!text?.trim()) return null;
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const scenes = arr.filter((scene) => scene && (scene.description || scene.narration));
    if (scenes.length === 0) return null;
    return { scenes };
  } catch {
    return null;
  }
}

const OPENAI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'generateMovieScript',
      description: 'Writes the generated movie script with scenes into the scene editor. Call this when the user has described their idea and you are ready to produce the script.',
      parameters: {
        type: 'object',
        properties: {
          scenes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sceneNumber: { type: 'integer' },
                description: { type: 'string' },
                narration: { type: 'string' },
              },
              required: ['sceneNumber', 'description', 'narration'],
            },
          },
        },
        required: ['scenes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'translateNarrations',
      description: 'Translate all scene narrations into a specified language and update them in the editor.',
      parameters: {
        type: 'object',
        properties: {
          targetLanguage: { type: 'string' },
        },
        required: ['targetLanguage'],
      },
    },
  },
  {
    type: 'function',
    function: { name: 'generateYouTubeTitle', description: 'Generate a YouTube title.', parameters: { type: 'object', properties: {} } },
  },
  {
    type: 'function',
    function: { name: 'generateYouTubeDescription', description: 'Generate a YouTube description.', parameters: { type: 'object', properties: {} } },
  },
  {
    type: 'function',
    function: { name: 'generateYouTubeThumbnail', description: 'Generate a YouTube thumbnail.', parameters: { type: 'object', properties: {} } },
  },
];

async function generateScenes(movieIdea) {
  const template = `You are a professional screenplay writer. Given this movie idea, generate a JSON array of scenes. 
Each scene must have exactly these keys: sceneNumber (integer), description (string - visual description 
for image generation), narration (string - spoken narration for TTS). 
CRITICAL: You must include emotional performance tags in square brackets at the 
start or middle of the text where appropriate (e.g., "[angry]", "[sad]", "[whispering]", 
"[excited]", "[determined]") to guide the TTS performance based on the scene's mood.).
In descriptions, you may reference up to 3 anchor images as "image 1", "image 2", "image 3" 
(e.g. "A person who looks like image 1 standing in front of image 2").
Return ONLY valid JSON, no markdown or extra text. Example format:
[{"sceneNumber":1,"description":"A sunset over mountains","narration":"As the sun sets behind the peaks..."},{"sceneNumber":2,"description":"A character resembling image 1 walks toward the horizon","narration":"..."}]

Movie idea:
${movieIdea.trim()}`;

  const data = await openaiFetch('chat/completions', {
    model: getOpenAIModel(),
    messages: [{ role: 'user', content: template }],
  });

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('No response from OpenAI');
  return parseScenesFromText(text);
}

async function translateText(text, targetLanguage) {
  if (!text?.trim()) return '';

  const prompt = `Translate the following narration text to ${targetLanguage}. Preserve any emotional tags in square brackets (e.g. [excited], [whispering]) exactly as they appear. Return ONLY the translated text, no explanation or quotes.\n\nText to translate:\n${text.trim()}`;

  const data = await openaiFetch('chat/completions', {
    model: getOpenAIModel(),
    messages: [{ role: 'user', content: prompt }],
  });

  const translated = data.choices?.[0]?.message?.content?.trim();
  if (!translated) throw new Error('No translation from OpenAI');
  return translated;
}

async function generateYouTubeTitle(scriptContext, anchorImagesInfo) {
  const prompt = `Based on this video script, generate a catchy YouTube title. Maximum ~70 characters. Return ONLY the title, no quotes or explanation.

${anchorImagesInfo ? `Anchor images: ${anchorImagesInfo}\n\n` : ''}Script:
${scriptContext || '(No script yet)'}`;

  const data = await openaiFetch('chat/completions', {
    model: getOpenAIModel(),
    messages: [{ role: 'user', content: prompt }],
  });

  const title = data.choices?.[0]?.message?.content?.trim();
  if (!title) throw new Error('No title from AI');
  return title.slice(0, 100);
}

async function generateYouTubeDescription(scriptContext, anchorImagesInfo) {
  const prompt = `Based on this video script, generate a YouTube description. Include 2-3 short paragraphs summarizing the video, then 3-5 relevant hashtags at the end. Return ONLY the description text.

${anchorImagesInfo ? `Anchor images: ${anchorImagesInfo}\n\n` : ''}Script:
${scriptContext || '(No script yet)'}`;

  const data = await openaiFetch('chat/completions', {
    model: getOpenAIModel(),
    messages: [{ role: 'user', content: prompt }],
  });

  const description = data.choices?.[0]?.message?.content?.trim();
  if (!description) throw new Error('No description from AI');
  return description;
}

async function generateImage(description) {
  const data = await openaiFetch('images/generations', {
    model: 'dall-e-3',
    prompt: description,
    n: 1,
    size: '1024x1792',
    response_format: 'b64_json',
    quality: 'standard',
  });

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image in response');
  return { data: b64, mimeType: 'image/png' };
}

async function generateThumbnailImage(prompt, quality = 'standard') {
  const data = await openaiFetch('images/generations', {
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1792',
    response_format: 'b64_json',
    quality: quality === 'hd' ? 'hd' : 'standard',
  });

  const first = data.data?.[0];
  const url = first?.url;
  const b64 = first?.b64_json;

  if (b64) {
    return { data: b64, mimeType: 'image/png' };
  }
  if (url) {
    return { imageUrl: url };
  }
  throw new Error('No image in response');
}

async function generateTTS(text, voice = 'alloy') {
  const cleanText = text.replace(/\[[\w\s]+\]/g, '').trim() || text;
  const audioBase64 = await openaiBinaryFetch('audio/speech', {
    model: 'tts-1-hd',
    input: cleanText,
    voice,
  });

  return { data: audioBase64, mimeType: 'audio/mpeg' };
}

function buildUserContent(message, anchorImages = []) {
  const hasImages = anchorImages.some((img) => img != null);
  if (!hasImages) return message;

  const parts = [
    { type: 'text', text: `Here are my anchor images (image 1, 2, 3) for style reference:\n\n${message}` },
  ];

  for (let i = 0; i < 3; i++) {
    const img = anchorImages[i];
    if (img?.data) {
      const mime = img.mimeType || 'image/png';
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${img.data}` },
      });
    }
  }

  return parts;
}

async function sendChat({ systemInstruction, messages, message, anchorImages = [] }) {
  const userContent = buildUserContent(message, anchorImages);
  const nextMessages = [...messages, { role: 'user', content: userContent }];

  const data = await openaiFetch('chat/completions', {
    model: getOpenAIModel(),
    messages: [
      { role: 'system', content: systemInstruction },
      ...nextMessages,
    ],
    tools: OPENAI_TOOLS,
    tool_choice: 'auto',
  });

  const messageObj = data.choices?.[0]?.message;
  if (!messageObj) throw new Error('No response from OpenAI');

  const toolCalls = (messageObj.tool_calls || []).map((tc) => ({
    name: tc.function?.name,
    args: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
  }));

  const text = messageObj.content?.trim() || '';
  const parsedScript = toolCalls.length === 0 ? tryParseScriptFromText(text) : null;

  return {
    text,
    functionCalls: toolCalls,
    parsedScript,
    history: [...nextMessages, messageObj],
  };
}

module.exports = {
  hasOpenAIKey,
  generateScenes,
  translateText,
  generateYouTubeTitle,
  generateYouTubeDescription,
  generateImage,
  generateThumbnailImage,
  generateTTS,
  sendChat,
  tryParseScriptFromText,
};
