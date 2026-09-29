export type HistoryState<T> = { entries: T[]; index: number };

export function createHistory<T>(initial: T): HistoryState<T> {
  return { entries: [initial], index: 0 };
}

export function appendHistory<T>(state: HistoryState<T>, next: T, limit: number): HistoryState<T> {
  if (state.entries[state.index] === next) return state;
  const entries = [...state.entries.slice(0, state.index + 1), next].slice(-limit);
  return { entries, index: entries.length - 1 };
}

export function moveHistory<T>(state: HistoryState<T>, direction: -1 | 1): HistoryState<T> {
  const index = Math.max(0, Math.min(state.entries.length - 1, state.index + direction));
  return { ...state, index };
}

export function currentHistoryValue<T>(state: HistoryState<T>) {
  return state.entries[state.index];
}
