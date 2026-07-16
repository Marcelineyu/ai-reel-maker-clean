import { postJson, serializeAnchorImages } from './apiClient';

export async function createAssistantChat(scenes = []) {
  const providers = await postJson('/api/providers', {});
  const hasAssistant = providers.openai || providers.gemini;
  if (!hasAssistant) return null;

  return {
    provider: providers.openai ? 'openai' : 'gemini',
    scenes,
    history: [],
    messages: [],
  };
}

export async function sendAssistantMessage(
  chat,
  message,
  onScript,
  anchorImages = [],
  onChunk,
  onTranslateNarrations,
  onGenerateYouTubeTitle,
  onGenerateYouTubeDescription,
  onGenerateYouTubeThumbnail
) {
  if (!chat) throw new Error('Assistant is not configured on the server');

  const serializedAnchors = await serializeAnchorImages(anchorImages);
  const data = await postJson('/api/chat', {
    message,
    scenes: chat.scenes || [],
    history: chat.history || [],
    messages: chat.messages || [],
    anchorImages: serializedAnchors,
  });

  if (data.provider === 'openai') {
    chat.messages = data.messages || chat.messages;
  } else {
    chat.history = data.history || chat.history;
  }

  const text = data.text || '';
  const functionCalls = data.functionCalls || [];

  if (functionCalls.length > 0) {
    for (const fc of functionCalls) {
      if (fc?.name === 'generateMovieScript' && fc?.args) {
        const lastUserMessage = message;
        if (lastUserMessage?.toLowerCase().includes('description')) {
          continue;
        }
        onScript(fc.args);
      }
      if (fc?.name === 'translateNarrations' && fc?.args?.targetLanguage && onTranslateNarrations) {
        await onTranslateNarrations(fc.args.targetLanguage);
        const confirmText = `All narrations translated to ${fc.args.targetLanguage}.`;
        onChunk?.(confirmText);
        return { text: confirmText, functionCalled: true };
      }
      if (fc?.name === 'generateYouTubeTitle' && onGenerateYouTubeTitle) {
        await onGenerateYouTubeTitle();
        onChunk?.('Generated YouTube title.');
        return { text: 'Generated YouTube title.', functionCalled: true };
      }
      if (fc?.name === 'generateYouTubeDescription' && onGenerateYouTubeDescription) {
        await onGenerateYouTubeDescription();
        onChunk?.('Generated YouTube description.');
        return { text: 'Generated YouTube description.', functionCalled: true };
      }
      if (fc?.name === 'generateYouTubeThumbnail' && onGenerateYouTubeThumbnail) {
        await onGenerateYouTubeThumbnail();
        onChunk?.('Generated YouTube thumbnail.');
        return { text: 'Generated YouTube thumbnail.', functionCalled: true };
      }
    }

    const confirmText = 'I\'ve added the script to your scene editor. You can review and edit it there, then generate images and audio for each scene.';
    onChunk?.(confirmText);
    return { text: confirmText, functionCalled: true };
  }

  if (data.parsedScript) {
    onScript(data.parsedScript);
    const confirmText = 'I\'ve added the script to your scene editor. You can review and edit it there, then generate images and audio for each scene.';
    onChunk?.(confirmText);
    return { text: confirmText, functionCalled: true };
  }

  onChunk?.(text);
  return { text, functionCalled: false };
}
