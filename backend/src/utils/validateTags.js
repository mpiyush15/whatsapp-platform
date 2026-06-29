export function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const cleaned = tags
    .map(t => {
      if (typeof t !== 'string') return null;
      const trimmed = t.trim();
      if (!trimmed) return null;
      if (trimmed.length > 30) return trimmed.slice(0, 30);
      // Strip leading $ to prevent query operator injection
      return trimmed.replace(/^\$/g, '');
    })
    .filter(Boolean);
  // Remove duplicates (case-insensitive)
  const uniq = [];
  const seen = new Set();
  for (const t of cleaned) {
    const low = t.toLowerCase();
    if (!seen.has(low)) {
      seen.add(low);
      uniq.push(t);
    }
  }
  return uniq;
}
