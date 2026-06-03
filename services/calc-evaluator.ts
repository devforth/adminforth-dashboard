import { Parser } from 'expr-eval-fork';
import type { DashboardVariables } from '../custom/model/dashboard.types.js';

const LOOKUP_VARIABLE_PATH_RE = /lookup\(\s*\$variables((?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)\s*,/g;
const CALC_PARSER_OPTIONS = {
  allowMemberAccess: false,
  operators: {
    assignment: false,
    concatenate: false,
    conditional: true,
    comparison: true,
    fndef: false,
    in: false,
    logical: true,
    random: false,
  },
} as const;

export function evaluateCalc(
  calc: string,
  values: Record<string, unknown>,
  variables: DashboardVariables = {},
) {
  const parser = createCalcParser(variables);

  return parser.parse(normalizeLookupPaths(calc)).evaluate(normalizeCalcValues(values));
}

function createCalcParser(variables: DashboardVariables) {
  const parser = new Parser(CALC_PARSER_OPTIONS);

  parser.functions.lookup = (path: string | number, key: string | number, defaultValue = 0) => {
    const map = resolveVariablePath(variables, String(path));
    const value = isRecord(map) && Object.prototype.hasOwnProperty.call(map, String(key))
      ? map[String(key)]
      : defaultValue;

    return toFiniteNumber(value);
  };

  return parser;
}

function normalizeLookupPaths(calc: string) {
  return calc.replace(LOOKUP_VARIABLE_PATH_RE, (_match, path: string) => {
    return `lookup("${path.replace(/^\./, '')}",`;
  });
}

function normalizeCalcValues(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key,
    typeof value === 'string' ? value : toFiniteNumber(value),
  ]));
}

function toFiniteNumber(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function resolveVariablePath(variables: DashboardVariables, path: string) {
  return path
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((current, segment) => isRecord(current) ? current[segment] : undefined, variables);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
