import React, { useState, useEffect, useCallback } from 'react';
import { GEMINI_TTS_VOICES, translateWithTimeout } from '../services/gemini';
import { OPENAI_TTS_VOICES } from '../services/openaiService';
import AnimatedDots from './AnimatedDots';

function AudioPlayer({ blob }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (blob) {
      const u = URL.createObjectURL(blob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setUrl(null);
  }, [blob]);
  if (!blob) return <span className="text-text-secondary text-xs">No audio yet</span>;
  if (!url) return <span className="text-text-secondary text-xs">Loading…</span>;
  return <audio src={url} controls className="w-full max-w-xs h-9" />;
}

const TRANSLATION_LANGUAGES = [
  { id: 'en', label: 'English', region: 'North America' },
  { id: 'es', label: 'Spanish', region: 'South America' },
  { id: 'fr', label: 'French', region: 'Europe' },
  { id: 'ar', label: 'Arabic', region: 'Africa' },
  { id: 'hi', label: 'Hindi', region: 'Asia' },
  { id: 'sw', label: 'Swahili', region: 'Africa' },
  { id: 'zh', label: 'Mandarin Chinese', region: 'Asia' },
  { id: 'pt', label: 'Portuguese', region: 'South America' },
  { id: 'de', label: 'German', region: 'Europe' },
  { id: 'ja', label: 'Japanese', region: 'Asia' },
  { id: 'zu', label: 'Zulu', region: 'Africa' },
  { id: 'id', label: 'Indonesian', region: 'Oceania' },
  { id: 'mi', label: 'Maori', region: 'Oceania' },
];

export default function SceneEditor({
  scenes, onUpdate, imageModels, providers, imageModel, onImageModelChange,
  voiceProvider, onVoiceProviderChange, voice, onVoiceChange,
  elevenLabsVoices, elevenLabsVoiceId, onElevenLabsVoiceChange,
  onGenerateImage, onGenerateAudio, generating,
}) {
  const isGenerating = generating !== null;
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [enlargedUrl, setEnlargedUrl] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translatedNarrations, setTranslatedNarrations] = useState({});
  const [translateLoading, setTranslateLoading] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  const handleTranslate = useCallback(async () => {
    const lang = TRANSLATION_LANGUAGES.find((l) => l.id === selectedLanguage);
    if (!lang) return;
    setTranslateLoading(true);
    setTranslatedNarrations({});
    try {
      const tasks = scenes
        .map((scene, i) => {
          const narration = scene?.narration?.trim();
          if (!narration) return null;
          return translateWithTimeout(narration, lang.label, 20000).then((t) => ({ i, t }));
        })
        .filter(Boolean);
      const results = await Promise.allSettled(tasks);
      const next = {};
      let someFailed = false;
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) next[r.value.i] = r.value.t;
        else someFailed = true;
      }
      setTranslatedNarrations(next);
      if (someFailed) alert('Some scenes failed to translate');
    } catch (err) {
      setTranslatedNarrations({});
      alert(err?.message || 'Translation failed');
    } finally {
      setTranslateLoading(false);
    }
  }, [scenes, selectedLanguage]);

  useEffect(() => {
    if (enlargedImage) {
      const url = URL.createObjectURL(enlargedImage);
      setEnlargedUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setEnlargedUrl(null);
  }, [enlargedImage]);

  return (
    <div className="space-y-5">
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-text-primary">Translation</span>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="input-field !w-auto !py-2 text-sm min-w-[180px]"
          disabled={translateLoading}
          aria-label="Target language"
        >
          {TRANSLATION_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>{lang.label} ({lang.region})</option>
          ))}
        </select>
        <button type="button" onClick={handleTranslate} disabled={translateLoading || isGenerating} className="btn-secondary text-sm">
          {translateLoading ? <AnimatedDots prefix="Translating" /> : 'Translate all'}
        </button>
        <label className="flex items-center gap-2 ml-auto cursor-pointer">
          <span className="text-sm text-text-secondary">Show translated</span>
          <button
            type="button"
            role="switch"
            aria-checked={showTranslated}
            onClick={() => setShowTranslated((p) => !p)}
            className={`relative inline-flex h-6 w-11 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${showTranslated ? 'bg-primary border-primary' : 'bg-border border-border'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${showTranslated ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>
      </div>

      <div className="grid gap-4">
        {scenes.map((scene, i) => (
          <article key={i} className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-surface-muted/30 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Scene {scene.sceneNumber}</span>
            </div>

            <div className="p-5 space-y-5">
            <div className="grid lg:grid-cols-2 gap-5">
              <div>
                <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">Description</label>
                <textarea
                  value={scene.description}
                  onChange={(e) => onUpdate(i, 'description', e.target.value)}
                  className="input-field mt-2 min-h-[108px] text-sm resize-y"
                  rows={4}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">Narration</label>
                {showTranslated && translatedNarrations[i] === undefined ? (
                  <div className="mt-2 min-h-[108px] px-4 py-3 rounded-lg bg-surface-muted border border-border text-text-secondary text-sm">
                    No translation yet. Use Translate all above.
                  </div>
                ) : (
                  <textarea
                    value={showTranslated ? (translatedNarrations[i] ?? '') : (scenes[i]?.narration ?? '')}
                    onChange={(e) =>
                      showTranslated
                        ? setTranslatedNarrations((prev) => ({ ...prev, [i]: e.target.value }))
                        : onUpdate(i, 'narration', e.target.value)
                    }
                    className="input-field mt-2 min-h-[108px] text-sm resize-y"
                    rows={4}
                  />
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 pt-5 border-t border-border">
              <div>
                <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide mb-2">Image</p>
                {scene.imageBlob ? (
                  <button type="button" onClick={() => setEnlargedImage(scene.imageBlob)} className="block w-full max-w-[152px]">
                    <img src={URL.createObjectURL(scene.imageBlob)} alt={`Scene ${scene.sceneNumber} preview`} className="w-full aspect-square object-cover rounded-lg border border-border hover:opacity-95 transition-opacity" />
                  </button>
                ) : (
                  <div className="w-full max-w-[152px] aspect-square rounded-lg bg-surface-muted border border-dashed border-border flex items-center justify-center text-text-secondary text-xs">
                    No image
                  </div>
                )}
                <button type="button" onClick={() => onGenerateImage(i)} disabled={isGenerating} className="btn-secondary text-xs mt-2 !py-1.5 !px-3">
                  {generating === i ? <AnimatedDots prefix="Generating" /> : 'Generate image'}
                </button>
              </div>
              <div>
                <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide mb-2">Audio</p>
                <AudioPlayer blob={scene.audioBlob} />
                <button type="button" onClick={() => onGenerateAudio(i)} disabled={isGenerating} className="btn-secondary text-xs mt-2 !py-1.5 !px-3">
                  {generating === i ? <AnimatedDots prefix="Generating" /> : 'Generate audio'}
                </button>
              </div>
            </div>
            </div>
          </article>
        ))}
      </div>

      {enlargedImage && enlargedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/60 p-4" onClick={() => setEnlargedImage(null)}>
          <button type="button" className="absolute top-4 right-4 text-white text-2xl" onClick={() => setEnlargedImage(null)} aria-label="Close">×</button>
          <img src={enlargedUrl} alt="Enlarged scene" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary">Image model</span>
          <select value={imageModel} onChange={(e) => onImageModelChange(e.target.value)} className="input-field !w-auto !py-2 text-sm">
            {imageModels.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary">Voice</span>
          <select value={voiceProvider} onChange={(e) => onVoiceProviderChange(e.target.value)} className="input-field !w-auto !py-2 text-sm">
            {providers?.openai && <option value="openai">OpenAI</option>}
            {providers?.gemini && <option value="gemini">Gemini</option>}
            {providers?.elevenlabs && <option value="elevenlabs">ElevenLabs</option>}
          </select>
          {voiceProvider === 'openai' && (
            <select value={voice} onChange={(e) => onVoiceChange(e.target.value)} className="input-field !w-auto !py-2 text-sm">
              {OPENAI_TTS_VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          {voiceProvider === 'gemini' && (
            <select value={voice} onChange={(e) => onVoiceChange(e.target.value)} className="input-field !w-auto !py-2 text-sm max-w-xs">
              {GEMINI_TTS_VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.name} — {v.tone}</option>
              ))}
            </select>
          )}
          {voiceProvider === 'elevenlabs' && (
            <select value={elevenLabsVoiceId} onChange={(e) => onElevenLabsVoiceChange?.(e.target.value)} className="input-field !w-auto !py-2 text-sm" disabled={!elevenLabsVoices?.length}>
              {!elevenLabsVoices?.length ? <option value="">Loading…</option> : elevenLabsVoices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
