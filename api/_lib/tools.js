const { Type } = require('@google/genai');

const movieTool = {
  functionDeclarations: [
    {
      name: 'generateMovieScript',
      description: 'Writes the generated movie script with scenes into the scene editor. Call this when the user has described their idea and you are ready to produce the script.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            description: 'Array of scene objects for the video reel',
            items: {
              type: Type.OBJECT,
              properties: {
                sceneNumber: { type: Type.INTEGER, description: 'Scene number (1-based index)' },
                description: { type: Type.STRING, description: 'Vivid visual description for image generation' },
                narration: { type: Type.STRING, description: 'Narration text with optional TTS tags like [excited] or [whispering]' },
              },
              required: ['sceneNumber', 'description', 'narration'],
            },
          },
        },
        required: ['scenes'],
      },
    },
    {
      name: 'translateNarrations',
      description: 'Translate all scene narrations into a specified language and update them in the editor. Use when the user asks to translate the script/narrations.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetLanguage: {
            type: Type.STRING,
            description: 'Target language name (e.g. "Spanish", "French", "Mandarin Chinese", "Japanese")',
          },
        },
        required: ['targetLanguage'],
      },
    },
    {
      name: 'generateYouTubeTitle',
      description: 'Generate a catchy YouTube title based on the current movie script and images, and display it in the YouTube Metadata section. Use when the user asks for a YouTube title.',
      parameters: { type: Type.OBJECT, properties: {} },
    },
    {
      name: 'generateYouTubeDescription',
      description: 'Generate a YouTube description (2-3 paragraphs + hashtags) based on the current movie script and images, and display it in the YouTube Metadata section. Use when the user asks for a YouTube description.',
      parameters: { type: Type.OBJECT, properties: {} },
    },
    {
      name: 'generateYouTubeThumbnail',
      description: 'Generate a YouTube thumbnail image based on the current movie script and images, and display it in the Thumbnail section. Use when the user asks for a YouTube thumbnail.',
      parameters: { type: Type.OBJECT, properties: {} },
    },
  ],
};

module.exports = { movieTool };
