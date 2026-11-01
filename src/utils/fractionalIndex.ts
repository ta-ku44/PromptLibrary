export { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

type FractionallyIndexed = { fractionalIndex: string };

export function sortByFractionalIndex<T extends FractionallyIndexed>(items: T[]): T[] {
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return items.toSorted((a, b) => compare(a.fractionalIndex, b.fractionalIndex));
}

// 末尾に追加するためのキー。配列の並びは順序と限らないので、並び替えてから最後の要素を基準にする
export function keyAtEnd(items: FractionallyIndexed[]): string {
  const sorted = sortByFractionalIndex(items);
  const last = sorted[sorted.length - 1];
  return generateKeyBetween(last?.fractionalIndex ?? null, null);
}

export function keyAtIndex(ids: string[], entities: Record<string, FractionallyIndexed>, index: number): string {
  return generateKeyBetween(entities[ids[index - 1]]?.fractionalIndex, entities[ids[index]]?.fractionalIndex);
}
