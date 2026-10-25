// プロンプト内の変数 {{名前: 型}} について、型ごとの入力形式の定義、パース、値の埋め込みを行う
type TypeDef = {
  pattern: RegExp;
  validate?: (raw: string) => boolean;
  format?: (raw: string) => string;
};

const VARIABLE_REGEX = /\{\{\s*([^\s:{}]+)\s*:\s*([^\s=}]+)\s*(?:=\s*\[([^\]]+)\])?\s*\}\}/g;
const VARIABLE_TYPES = {
  string: { pattern: /^.+$/s },
  int: { pattern: /^-?\d+$/ },
  float: { pattern: /^-?\d+(\.\d+)?$/ },
  url: { pattern: /^https?:\/\/\S+$/, validate: URL.canParse },
  date: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
  datetime: {
    pattern: /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/,
    validate: (raw) => true,
    format: (raw) => raw.replace('T', ' '),
  },
  time: { pattern: /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, validate: (raw) => true },
  year: { pattern: /^\d{4}$/ },
} as const satisfies Record<string, TypeDef>;

type VariableType = keyof typeof VARIABLE_TYPES;

export type Variable = {
  name: string;
  type: VariableType;
  options?: string[];
};

function toVariable(name: string, rawType: string, opts?: string): Variable | null {
  const type = rawType.toLowerCase() as VariableType;
  if (!Object.hasOwn(VARIABLE_TYPES, type)) return null;

  const { pattern, validate }: TypeDef = VARIABLE_TYPES[type];
  const options = opts?.split(',').map((s) => s.trim());
  if (options?.some((option) => !pattern.test(option) || validate?.(option) === false)) return null;

  return { name, type, options };
}

export function parseVariables(text: string): Variable[] {
  const variables = new Map<string, Variable>();

  for (const [, name, type, opts] of text.matchAll(VARIABLE_REGEX)) {
    const variable = toVariable(name, type, opts);
    if (variable && !variables.has(name)) variables.set(name, variable);
  }
  return [...variables.values()];
}

export function hasVariables(text: string): boolean {
  return parseVariables(text).length > 0;
}

export function applyValues(content: string, values: Record<string, string>): string {
  return content.replace(VARIABLE_REGEX, (match: string, name: string, type: string, opts?: string) => {
    const variable = toVariable(name, type, opts);
    if (!variable) return match;

    const value = values[name];
    if (value === undefined) return '';
    const { format }: TypeDef = VARIABLE_TYPES[variable.type];
    return format?.(value) ?? value;
  });
}
