import React from 'react';

export default function AnchorImages({ anchorImages, onAnchorChange }) {
  const handleFile = (index, file) => {
    if (file) onAnchorChange(index, file);
  };

  const handleDrop = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file?.type?.startsWith('image/')) handleFile(index, file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary leading-relaxed">
        Add up to three reference images. In scene descriptions, refer to them as{' '}
        <strong className="text-text-primary font-medium">image 1</strong>,{' '}
        <strong className="text-text-primary font-medium">image 2</strong>, or{' '}
        <strong className="text-text-primary font-medium">image 3</strong>.
      </p>
      <div className="grid grid-cols-3 gap-3 max-w-sm">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-col">
            <label
              className="flex flex-col items-center justify-center w-full aspect-square rounded-lg border border-dashed border-border bg-surface-muted/50 cursor-pointer hover:border-primary/35 hover:bg-surface-soft overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-primary/20"
              onDrop={(e) => handleDrop(n - 1, e)}
              onDragOver={handleDragOver}
            >
              {anchorImages[n - 1] ? (
                <img src={URL.createObjectURL(anchorImages[n - 1])} alt={`Anchor reference ${n}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-text-secondary text-xs text-center px-2 leading-snug">Add image</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                aria-label={`Upload anchor reference ${n}`}
                onChange={(e) => {
                  handleFile(n - 1, e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            <span className="text-[11px] text-text-secondary mt-1.5">Image {n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
