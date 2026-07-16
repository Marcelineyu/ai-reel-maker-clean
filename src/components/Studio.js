import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  generateScenes, generateImage, generateTTS, fetchElevenLabsVoices,
  generateYouTubeTitle, generateYouTubeDescription, generateYouTubeThumbnail,
  translateText, fetchProviders, getImageModels,
} from '../services/gemini';
import { assembleVideo } from '../services/ffmpegService';
import { createAssistantChat, sendAssistantMessage } from '../services/apiService';
import { buildFullScript } from '../utils/scriptContext';
import MovieInput from './MovieInput';
import AnchorImages from './AnchorImages';
import AnimatedDots from './AnimatedDots';
import SceneEditor from './SceneEditor';
import VideoAssembly from './VideoAssembly';
import ChatAssistant, { ChatFab } from './ChatAssistant';
import StudioHeader from './StudioHeader';

function getProjectName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `video_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

const initialScene = (item) => ({
  sceneNumber: item.sceneNumber ?? 0,
  description: item.description ?? '',
  narration: item.narration ?? '',
  imageBlob: null,
  audioBlob: null,
});

export default function Studio({ onGoHome }) {
  const [projectName, setProjectName] = useState(null);
  const [movieIdea, setMovieIdea] = useState('');
  const [anchorImages, setAnchorImages] = useState([null, null, null]);
  const [scenes, setScenes] = useState([]);
  const [providers, setProviders] = useState({ openai: false, gemini: false, elevenlabs: false });
  const [imageModel, setImageModel] = useState('gemini-2.5-flash-image');
  const [voiceProvider, setVoiceProvider] = useState('gemini');
  const [voice, setVoice] = useState('Kore');
  const [elevenLabsVoices, setElevenLabsVoices] = useState([]);
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(null);
  const [assembleProgress, setAssembleProgress] = useState(null);
  const [assembleStatus, setAssembleStatus] = useState({ currentScene: null, totalScenes: 0 });
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [outputBlob, setOutputBlob] = useState(null);
  const [error, setError] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const assistantChatRef = useRef(null);
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [titleLoading, setTitleLoading] = useState(false);
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [thumbnailModel, setThumbnailModel] = useState('cheap');
  const [thumbnailBlob, setThumbnailBlob] = useState(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState(null);

  useEffect(() => {
    fetchProviders()
      .then((available) => {
        setProviders(available);
        const imageModels = getImageModels(available);
        if (available.openai) {
          setImageModel('dall-e-3');
          setVoiceProvider('openai');
          setVoice('alloy');
        } else if (imageModels.length > 0) {
          setImageModel(imageModels[0].id);
        }
        if (!available.openai && available.gemini) {
          setVoiceProvider('gemini');
          setVoice('Kore');
        }
      })
      .catch((err) => console.error('Error loading provider availability:', err));
  }, []);

  useEffect(() => {
    if (voiceProvider === 'elevenlabs') {
      fetchElevenLabsVoices()
        .then((voices) => {
          setElevenLabsVoices(voices);
          if (voices.length > 0 && !elevenLabsVoiceId) setElevenLabsVoiceId(voices[0].id);
        })
        .catch((err) => console.error('Error loading ElevenLabs voices:', err));
    }
  }, [voiceProvider, elevenLabsVoiceId]);

  useEffect(() => {
    if (thumbnailBlob) {
      const url = URL.createObjectURL(thumbnailBlob);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setThumbnailUrl(null);
  }, [thumbnailBlob]);

  const handleGenerateScenes = useCallback(async () => {
    if (!movieIdea.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const generated = await generateScenes(movieIdea.trim());
      setScenes(generated.map(initialScene));
      setProjectName(getProjectName());
    } catch (err) {
      setError(err?.message || 'Failed to generate scenes');
    } finally {
      setLoading(false);
    }
  }, [movieIdea]);

  const handleUpdateScene = useCallback((index, field, value) => {
    setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }, []);

  const handleGenerateImage = useCallback(async (index) => {
    const scene = scenes[index];
    if (!scene?.description) return;
    setGeneratingIndex(index);
    setError(null);
    try {
      const blob = await generateImage(scene.description, anchorImages, imageModel);
      setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, imageBlob: blob } : s)));
    } catch (err) {
      setError(err?.message || 'Failed to generate image');
    } finally {
      setGeneratingIndex(null);
    }
  }, [scenes, anchorImages, imageModel]);

  const handleAnchorChange = useCallback((index, file) => {
    setAnchorImages((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  }, []);

  const handleGenerateAudio = useCallback(async (index) => {
    const scene = scenes[index];
    if (!scene?.narration) return;
    setGeneratingIndex(index);
    setError(null);
    try {
      const voiceToUse = voiceProvider === 'elevenlabs' ? elevenLabsVoiceId : voice;
      const blob = await generateTTS(scene.narration, voiceProvider, voiceToUse);
      setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, audioBlob: blob } : s)));
    } catch (err) {
      setError(err?.message || 'Failed to generate audio');
    } finally {
      setGeneratingIndex(null);
    }
  }, [scenes, voice, voiceProvider, elevenLabsVoiceId]);

  const handleAssistantScript = useCallback((args) => {
    if (!args?.scenes || !Array.isArray(args.scenes)) return;
    setScenes(args.scenes.map((s) => initialScene(s)));
    setProjectName(getProjectName());
  }, []);

  const handleTranslateNarrations = useCallback(async (targetLanguage) => {
    const updated = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const narration = scene?.narration?.trim();
      if (!narration) {
        updated.push(scene);
        continue;
      }
      const translated = await translateText(narration, targetLanguage);
      updated.push({ ...scene, narration: translated });
    }
    setScenes(updated);
  }, [scenes]);

  const buildAnchorImagesInfo = useCallback(() => {
    return anchorImages
      .map((f, i) => (f ? `Image ${i + 1}: ${f.name || 'uploaded'}` : `Image ${i + 1}: (none)`))
      .join(', ');
  }, [anchorImages]);

  const handleGenerateYouTubeTitleFromChat = useCallback(async () => {
    const scriptContext = buildFullScript(scenes);
    const anchorPart = buildAnchorImagesInfo();
    const sceneImagesPart = scenes.map((s, i) => (s.imageBlob ? `Scene ${i + 1}: yes` : `Scene ${i + 1}: no`)).join(', ');
    const title = await generateYouTubeTitle(scriptContext, `${anchorPart}. Scene images: ${sceneImagesPart}`);
    setYoutubeTitle(title);
  }, [scenes, buildAnchorImagesInfo]);

  const handleGenerateYouTubeDescriptionFromChat = useCallback(async () => {
    const scriptContext = buildFullScript(scenes);
    const desc = await generateYouTubeDescription(scriptContext, buildAnchorImagesInfo());
    setYoutubeDescription(desc);
  }, [scenes, buildAnchorImagesInfo]);

  const handleGenerateYouTubeThumbnailFromChat = useCallback(async () => {
    const scriptContext = buildFullScript(scenes);
    const result = await generateYouTubeThumbnail(scriptContext, buildAnchorImagesInfo(), anchorImages, thumbnailModel);
    if (typeof result === 'string') {
      setThumbnailImageUrl(result);
      setThumbnailBlob(null);
    } else {
      setThumbnailBlob(result);
      setThumbnailImageUrl(null);
    }
  }, [scenes, buildAnchorImagesInfo, anchorImages, thumbnailModel]);

  const handleChatSend = useCallback(
    async (message) => {
      if (!message.trim()) return;
      setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
      setChatLoading(true);
      setError(null);
      try {
        if (!assistantChatRef.current) {
          assistantChatRef.current = await createAssistantChat(scenes);
        }
        const chat = assistantChatRef.current;
        if (!chat) {
          setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Assistant is not configured. Set GEMINI_API_KEY and/or OPENAI_API_KEY in your server environment and run the app with vercel dev.' }]);
          return;
        }
        if (chat.provider === 'gemini' || chat.provider === 'openai') {
          chat.scenes = scenes;
        }
        setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
        const onChunk = (text) => {
          setChatMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: text };
            return next;
          });
        };
        await sendAssistantMessage(
          chat, message, handleAssistantScript, anchorImages, onChunk,
          handleTranslateNarrations, handleGenerateYouTubeTitleFromChat,
          handleGenerateYouTubeDescriptionFromChat, handleGenerateYouTubeThumbnailFromChat,
        );
      } catch (err) {
        setChatMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && last?.content === '') {
            next[next.length - 1] = { ...last, content: err?.message || 'Failed to get response' };
          } else {
            next.push({ role: 'assistant', content: err?.message || 'Failed to get response' });
          }
          return next;
        });
        setError(err?.message || 'Assistant error');
      } finally {
        setChatLoading(false);
      }
    },
    [scenes, handleAssistantScript, anchorImages, handleTranslateNarrations, handleGenerateYouTubeTitleFromChat, handleGenerateYouTubeDescriptionFromChat, handleGenerateYouTubeThumbnailFromChat],
  );

  const handleAssemble = useCallback(async () => {
    const ready = scenes.filter((s) => s.imageBlob && s.audioBlob);
    if (ready.length !== scenes.length) {
      setError('Generate images and audio for all scenes first');
      return;
    }
    setAssembleProgress(0);
    setAssembleStatus({ currentScene: null, totalScenes: scenes.length });
    setError(null);
    try {
      const blob = await assembleVideo(scenes, (p, status) => {
        setAssembleProgress(p);
        if (status) setAssembleStatus(status);
      }, { includeSubtitles });
      setOutputBlob(blob);
      setAssembleProgress(1);
      setAssembleStatus({ currentScene: null, totalScenes: scenes.length });
    } catch (err) {
      setError(err?.message || 'Failed to assemble video');
      setAssembleProgress(null);
      setAssembleStatus({ currentScene: null, totalScenes: 0 });
    }
  }, [scenes, includeSubtitles]);

  const handleGenerateYouTubeTitle = useCallback(async () => {
    setTitleLoading(true);
    setError(null);
    try {
      const title = await generateYouTubeTitle(buildFullScript(scenes), buildAnchorImagesInfo());
      setYoutubeTitle(title);
    } catch (err) {
      setError(err?.message || 'Failed to generate title');
    } finally {
      setTitleLoading(false);
    }
  }, [scenes, buildAnchorImagesInfo]);

  const handleGenerateYouTubeDescription = useCallback(async () => {
    setDescriptionLoading(true);
    setError(null);
    try {
      const desc = await generateYouTubeDescription(buildFullScript(scenes), buildAnchorImagesInfo());
      setYoutubeDescription(desc);
    } catch (err) {
      setError(err?.message || 'Failed to generate description');
    } finally {
      setDescriptionLoading(false);
    }
  }, [scenes, buildAnchorImagesInfo]);

  const handleGenerateThumbnail = useCallback(async () => {
    setThumbnailLoading(true);
    setError(null);
    try {
      const result = await generateYouTubeThumbnail(buildFullScript(scenes), buildAnchorImagesInfo(), anchorImages, thumbnailModel);
      if (typeof result === 'string') {
        setThumbnailImageUrl(result);
        setThumbnailBlob(null);
      } else {
        setThumbnailBlob(result);
        setThumbnailImageUrl(null);
      }
    } catch (err) {
      setError(err?.message || 'Failed to generate thumbnail');
    } finally {
      setThumbnailLoading(false);
    }
  }, [scenes, buildAnchorImagesInfo, anchorImages, thumbnailModel]);

  return (
    <div className="min-h-screen bg-bg">
      <StudioHeader providers={providers} onGoHome={onGoHome} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24">
        <div className="mb-10">
          <h1 className="text-2xl sm:text-[1.75rem] font-semibold text-text-primary tracking-tight">New reel</h1>
          <p className="text-text-secondary mt-2 max-w-xl leading-relaxed">
            Start with a concept, outline your scenes, then build visuals, audio, and publishing materials.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-5 text-xs text-text-secondary">
            <span className="px-2 py-0.5 rounded-md bg-surface-soft border border-primary/20 text-primary font-medium">Idea</span>
            <span aria-hidden className="text-border">→</span>
            <span className="px-2 py-0.5 rounded-md border border-border">Scenes</span>
            <span aria-hidden className="text-border">→</span>
            <span className="px-2 py-0.5 rounded-md border border-border">Visuals &amp; audio</span>
            <span aria-hidden className="text-border">→</span>
            <span className="px-2 py-0.5 rounded-md border border-border">Publish</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        <section className="card p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-3 mb-6 pb-5 border-b border-border">
            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-soft border border-border text-xs font-medium text-primary shrink-0">1</span>
            <div>
              <h2 className="text-base font-medium text-text-primary">Concept &amp; references</h2>
              <p className="text-sm text-text-secondary mt-0.5">Describe your idea and add optional reference images.</p>
            </div>
          </div>

          <MovieInput
            value={movieIdea}
            onChange={setMovieIdea}
            disabled={loading}
            onExampleClick={setMovieIdea}
          />

          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Anchor images <span className="font-normal text-text-secondary">(optional)</span></h3>
            <AnchorImages anchorImages={anchorImages} onAnchorChange={handleAnchorChange} />
          </div>

          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-text-secondary">Generates structured scenes from your concept.</p>
            <button
              type="button"
              onClick={handleGenerateScenes}
              disabled={loading || !movieIdea.trim()}
              className="btn-primary min-w-[160px]"
            >
              {loading ? <AnimatedDots prefix="Generating" /> : 'Generate scenes'}
            </button>
          </div>
        </section>

        {scenes.length > 0 && (
          <>
            <section className="mb-8">
              <div className="flex items-start gap-3 mb-6">
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-soft border border-border text-xs font-medium text-primary shrink-0">2</span>
                <div>
                  <h2 className="text-base font-medium text-text-primary">Scenes</h2>
                  <p className="text-sm text-text-secondary mt-0.5">Edit copy, generate visuals and audio, and manage translations.</p>
                </div>
              </div>
              <SceneEditor
                scenes={scenes}
                onUpdate={handleUpdateScene}
                imageModels={getImageModels(providers)}
                providers={providers}
                imageModel={imageModel}
                onImageModelChange={setImageModel}
                voiceProvider={voiceProvider}
                onVoiceProviderChange={setVoiceProvider}
                voice={voice}
                onVoiceChange={setVoice}
                elevenLabsVoices={elevenLabsVoices}
                elevenLabsVoiceId={elevenLabsVoiceId}
                onElevenLabsVoiceChange={setElevenLabsVoiceId}
                onGenerateImage={handleGenerateImage}
                onGenerateAudio={handleGenerateAudio}
                generating={generatingIndex}
              />
            </section>

            <section className="card p-6 sm:p-8 mb-8">
              <div className="flex items-start gap-3 mb-6 pb-5 border-b border-border">
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-soft border border-border text-xs font-medium text-primary shrink-0">3</span>
                <div>
                  <h2 className="text-base font-medium text-text-primary">Video assembly</h2>
                  <p className="text-sm text-text-secondary mt-0.5">Combine scene images and audio into a finished reel.</p>
                </div>
              </div>
              <VideoAssembly
                onAssemble={handleAssemble}
                assembleProgress={assembleProgress}
                assembleStatus={assembleStatus}
                includeSubtitles={includeSubtitles}
                onIncludeSubtitlesChange={setIncludeSubtitles}
                outputBlob={outputBlob}
                projectName={projectName}
              />
            </section>

            <section className="card p-6 sm:p-8 mb-8 bg-surface-soft/40">
              <div className="flex items-start gap-3 mb-6 pb-5 border-b border-border">
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-surface border border-border text-xs font-medium text-primary shrink-0">4</span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">Publishing</p>
                  <h2 className="text-base font-medium text-text-primary mt-0.5">YouTube metadata</h2>
                  <p className="text-sm text-text-secondary mt-1">Draft a title, description, and thumbnail from your reel.</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleGenerateYouTubeTitle} disabled={titleLoading || descriptionLoading || thumbnailLoading} className="btn-primary text-sm">
                    {titleLoading ? <AnimatedDots prefix="Generating" /> : 'Generate title'}
                  </button>
                  <button type="button" onClick={handleGenerateYouTubeDescription} disabled={titleLoading || descriptionLoading || thumbnailLoading} className="btn-primary text-sm">
                    {descriptionLoading ? <AnimatedDots prefix="Generating" /> : 'Generate description'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Title</label>
                  <textarea value={youtubeTitle} readOnly rows={2} className="input-field text-sm resize-y" placeholder="Click Generate title…" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Description</label>
                  <textarea value={youtubeDescription} readOnly rows={6} className="input-field text-sm resize-y" placeholder="Click Generate description…" />
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <label className="text-sm font-medium text-text-primary">Thumbnail model</label>
                    <select value={thumbnailModel} onChange={(e) => setThumbnailModel(e.target.value)} className="input-field !w-auto !py-2 text-sm" disabled={thumbnailLoading}>
                      <option value="cheap">Cheap</option>
                      <option value="expensive">Expensive</option>
                    </select>
                    <button type="button" onClick={handleGenerateThumbnail} disabled={titleLoading || descriptionLoading || thumbnailLoading} className="btn-secondary text-sm">
                      {thumbnailLoading ? <AnimatedDots prefix="Generating" /> : 'Generate thumbnail'}
                    </button>
                  </div>
                  <div className="rounded-xl bg-surface-muted border border-border p-4 min-h-[200px] flex items-center justify-center">
                    {(thumbnailImageUrl || thumbnailUrl) ? (
                      <img src={thumbnailImageUrl || thumbnailUrl} alt="YouTube thumbnail preview" className="max-w-full max-h-[400px] object-contain rounded-lg" />
                    ) : (
                      <span className="text-text-secondary text-sm">Thumbnail preview will appear here</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {chatOpen ? (
        <ChatAssistant
          messages={chatMessages}
          onSend={handleChatSend}
          loading={chatLoading}
          onClose={() => {
            setChatOpen(false);
            assistantChatRef.current = null;
            setChatMessages([]);
          }}
          isOpen
        />
      ) : (
        <ChatFab onClick={() => setChatOpen(true)} />
      )}
    </div>
  );
}
