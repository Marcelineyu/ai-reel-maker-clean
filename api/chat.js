const {
  parseJsonBody,
  requirePost,
  requireString,
  validateAnchorImages,
  withTimeout,
  loadPrompt,
  handleApiError,
  sendError,
  MAX_TEXT_LENGTH,
} = require('./_lib/validation');
const {
  getGeminiClient,
  buildFullScript,
  MODELS,
} = require('./_lib/gemini');
const { sendChat } = require('./_lib/openai');
const { movieTool } = require('./_lib/tools');
const { preferOpenAIForText } = require('./_lib/providers');

function buildSystemInstruction(scenes) {
  const basePrompt = loadPrompt('chat_prompt.txt');
  const fullScript = buildFullScript(scenes);
  return fullScript
    ? `You are a film script assistant. You can reference the script by scene number and suggest improvements.\n\nCurrent script:\n${fullScript}\n\n---\n\n${basePrompt}`
    : basePrompt;
}

function historyToContents(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'model'))
    .map((item) => ({
      role: item.role,
      parts: item.parts || [{ text: item.text || '' }],
    }));
}

function buildUserParts(message, anchorImages = []) {
  const hasImages = anchorImages.some((img) => img != null);
  if (!hasImages) {
    return [{ text: message }];
  }

  const parts = [{
    text: `Here are my anchor images (image 1, 2, 3) for style reference:\n\n${message}`,
  }];

  for (let i = 0; i < 3; i++) {
    const img = anchorImages[i];
    if (img?.data) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/png',
          data: img.data,
        },
      });
    }
  }

  return parts;
}

function extractFunctionCalls(response) {
  let functionCalls = response?.functionCalls;
  if (!functionCalls?.length) {
    const parts = response?.candidates?.[0]?.content?.parts || [];
    functionCalls = parts
      .filter((part) => part.functionCall)
      .map((part) => part.functionCall)
      .filter(Boolean);
  }
  return functionCalls || [];
}

function extractText(response) {
  return response?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('')
    .trim() || '';
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

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  const messageCheck = requireString(parsed.data.message, 'message', MAX_TEXT_LENGTH);
  if (!messageCheck.ok) return sendError(res, 400, messageCheck.error);

  const anchorCheck = validateAnchorImages(parsed.data.anchorImages);
  if (!anchorCheck.ok) return sendError(res, 400, anchorCheck.error);

  const scenes = Array.isArray(parsed.data.scenes) ? parsed.data.scenes : [];
  const history = Array.isArray(parsed.data.history) ? parsed.data.history : [];
  const messages = Array.isArray(parsed.data.messages) ? parsed.data.messages : [];

  try {
    if (preferOpenAIForText()) {
      const systemInstruction = buildSystemInstruction(scenes);
      const result = await withTimeout(sendChat({
        systemInstruction,
        messages,
        message: messageCheck.value,
        anchorImages: anchorCheck.value,
      }));

      return res.status(200).json({
        provider: 'openai',
        text: result.text,
        functionCalls: result.functionCalls,
        parsedScript: result.parsedScript,
        messages: result.history,
      });
    }

    const ai = await withTimeout(getGeminiClient());
    const systemInstruction = buildSystemInstruction(scenes);
    const userParts = buildUserParts(messageCheck.value, anchorCheck.value);
    const contents = [
      ...historyToContents(history),
      { role: 'user', parts: userParts },
    ];

    const response = await withTimeout(ai.models.generateContent({
      model: MODELS.text,
      contents,
      config: {
        systemInstruction,
        tools: [movieTool],
        toolConfig: {
          functionCallingConfig: { mode: 'AUTO' },
        },
      },
    }));

    const text = extractText(response);
    const functionCalls = extractFunctionCalls(response).map((fc) => ({
      name: fc.name,
      args: fc.args || {},
    }));

    const updatedHistory = [
      ...history,
      { role: 'user', parts: userParts },
      {
        role: 'model',
        parts: [
          ...(text ? [{ text }] : []),
          ...functionCalls.map((fc) => ({ functionCall: { name: fc.name, args: fc.args } })),
        ],
      },
    ];

    const parsedScript = functionCalls.length === 0 ? tryParseScriptFromText(text) : null;

    return res.status(200).json({
      provider: 'gemini',
      text,
      functionCalls,
      parsedScript,
      history: updatedHistory,
    });
  } catch (err) {
    return handleApiError(res, err, 'chat');
  }
};
