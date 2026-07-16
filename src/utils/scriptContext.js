/**
 * Build full script string from scenes for chat context.
 * Format:
 * Scene 1
 * Description: ...
 * Narration: ...
 *
 * Scene 2
 * ...
 */
export function buildFullScript(scenes) {
  if (!scenes?.length) return '';
  return scenes
    .map((s, i) => {
      const num = s.sceneNumber ?? i + 1;
      const desc = s.description ?? '';
      const narr = s.narration ?? '';
      return `Scene ${num}\nDescription: ${desc}\nNarration: ${narr}`;
    })
    .join('\n\n');
}
