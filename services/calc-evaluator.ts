import { Parser } from 'expr-eval-fork';

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

const CALC_PARSER = new Parser(CALC_PARSER_OPTIONS);

export function evaluateCalc(calc: string, values: Record<string, unknown>) {
  return CALC_PARSER.parse(calc).evaluate(normalizeCalcValues(values));
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
