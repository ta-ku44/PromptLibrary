import { StateCreator } from 'zustand';
import { hasVariables, applyValues } from '@/utils/variables';
import type { Item } from '@/types/catalog';
import type { CaretRect } from '../../utils/inputBox';

type FlowPhase =
  | { kind: 'idle' }
  | { kind: 'suggestion'; query: string; caretRect: CaretRect | null }
  | { kind: 'confirming'; prompt: Item; values: Record<string, string> }
  | { kind: 'injecting'; text: string };

export interface FlowSlice {
  phase: FlowPhase;
  updateSuggestion: (query: string, caretRect: CaretRect | null) => void;
  chooseItem: (prompt: Item) => void;
  setVariableValue: (variableName: string, value: string) => void;
  confirm: () => void;
  resetFlow: () => void;
}

type Transition<K extends FlowPhase['kind']> = (phase: Extract<FlowPhase, { kind: K }>) => FlowPhase | null;

export const createFlowSlice: StateCreator<FlowSlice> = (set) => {
  const guard = <K extends FlowPhase['kind']>(kind: K, fn: Transition<K>) =>
    set((state: FlowSlice) => {
      if (state.phase.kind !== kind) return {};
      const next = fn(state.phase as Extract<FlowPhase, { kind: K }>);
      return next ? { phase: next } : {};
    });

  return {
    phase: { kind: 'idle' },
    updateSuggestion: (query, caretRect) => set({ phase: { kind: 'suggestion', query, caretRect } }),
    chooseItem: (prompt) => guard('suggestion', (_) => hasVariables(prompt.content)
      ? { kind: 'confirming', prompt, values: {} }
      : { kind: 'injecting', text: prompt.content }),
    setVariableValue: (name, value) => guard('confirming', (p) => ({ ...p, values: { ...p.values, [name]: value } })),
    confirm: () => guard('confirming', (p) => ({ kind: 'injecting', text: applyValues(p.prompt.content, p.values) })),
    resetFlow: () => set({ phase: { kind: 'idle' } }),
  };
};
