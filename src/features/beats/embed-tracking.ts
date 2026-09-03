const playedIds = new Set<string>();

export function trackEmbedView(beatId: string): void {
  fetch(`/api/embed/${beatId}/view`, { method: "POST" }).catch(() => {});
}

export function trackEmbedPlay(beatId: string): void {
  if (playedIds.has(beatId)) return;
  playedIds.add(beatId);
  fetch(`/api/beats/${beatId}/plays`, { method: "POST" }).catch(() => {});
}
