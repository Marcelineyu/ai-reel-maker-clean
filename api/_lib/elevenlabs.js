function getElevenLabsKey() {
  return (process.env.ELEVENLABS_API_KEY || '').trim();
}

function hasElevenLabsKey() {
  return !!getElevenLabsKey();
}

async function fetchVoices() {
  const apiKey = getElevenLabsKey();
  if (!apiKey) throw new Error('ElevenLabs API key not configured on server');

  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    method: 'GET',
    headers: { 'xi-api-key': apiKey },
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs API error: ${res.status}`);
  }

  const data = await res.json();
  return (data.voices || [])
    .map((voice) => ({ id: voice.voice_id, name: voice.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function generateSpeech(text, voiceId) {
  const apiKey = getElevenLabsKey();
  if (!apiKey) throw new Error('ElevenLabs API key not configured on server');
  if (!voiceId) throw new Error('Voice ID is required');

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text, model_id: 'eleven_v3' }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs TTS error: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return { data: buffer.toString('base64'), mimeType: 'audio/mpeg' };
}

module.exports = {
  hasElevenLabsKey,
  fetchVoices,
  generateSpeech,
};
