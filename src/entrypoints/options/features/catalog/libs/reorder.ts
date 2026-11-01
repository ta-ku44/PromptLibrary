export type Edge = 'top' | 'bottom' | null;

export const insertIndex = (ids: string[], overId: string, edge: Edge): number =>
  ids.indexOf(overId) + (edge === 'bottom' ? 1 : 0);
