import React from 'react';
import AnimatedDots from './AnimatedDots';

export default function VideoAssembly({ onAssemble, assembleProgress, assembleStatus, includeSubtitles, onIncludeSubtitlesChange, outputBlob, projectName }) {
  const [previewUrl, setPreviewUrl] = React.useState(null);

  React.useEffect(() => {
    if (outputBlob) {
      const url = URL.createObjectURL(outputBlob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [outputBlob]);

  const handleDownload = () => {
    if (!outputBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(outputBlob);
    a.download = `${projectName || 'output'}.mp4`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAssemble}
          disabled={assembleProgress !== null && assembleProgress < 1}
          className="btn-primary"
        >
          {assembleProgress !== null && assembleProgress < 1 ? <AnimatedDots prefix="Generating" /> : 'Generate video'}
        </button>
        <button
          type="button"
          onClick={() => onIncludeSubtitlesChange?.(!includeSubtitles)}
          disabled={assembleProgress !== null && assembleProgress < 1}
          className={`px-4 py-2 rounded-lg font-medium text-sm border transition-colors disabled:opacity-50 ${includeSubtitles ? 'bg-surface-soft border-primary/30 text-primary' : 'bg-surface border-border text-text-secondary'}`}
        >
          Subtitles {includeSubtitles ? 'on' : 'off'}
        </button>
      </div>

      {assembleProgress !== null && assembleProgress < 1 && (
        <div className="text-sm text-text-secondary">
          <div className="flex justify-between mb-1.5">
            <span>
              {assembleStatus?.currentScene != null
                ? `Scene ${assembleStatus.currentScene} of ${assembleStatus.totalScenes || ''}`
                : 'Merging scenes…'}
            </span>
            <span>{Math.round((assembleProgress ?? 0) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.round((assembleProgress ?? 0) * 100)}%` }} />
          </div>
        </div>
      )}

      {assembleProgress === 1 && outputBlob && (
        <div className="space-y-4 pt-2">
          <div className="aspect-video max-w-2xl rounded-lg overflow-hidden bg-text-primary border border-border">
            {previewUrl && <video src={previewUrl} controls className="w-full h-full" />}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleDownload} className="btn-primary">Download</button>
            <button type="button" onClick={() => window.open(previewUrl, '_blank')} className="btn-secondary">Replay</button>
          </div>
        </div>
      )}
    </div>
  );
}
