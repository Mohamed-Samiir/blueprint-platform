import { existsSync } from 'node:fs';
import { ArrayLiteralExpression, Expression, Project, SyntaxKind } from 'ts-morph';
import {
  ArrayFieldEntry,
  ButtonFieldEntry,
  ButtonVariant,
  ControlFieldEntry,
  ControlFieldType,
  FieldModelEntry,
  FieldType,
  GroupFieldEntry,
  RESERVED_HANDLER_NAMES,
  VALID_VALIDATOR_KEYS,
} from './field-model.types';

const VALID_FIELD_TYPES: readonly FieldType[] = [
  'textInput',
  'numberInput',
  'timePicker',
  'select',
  'selectMultiple',
  'combobox',
  'comboboxMultiple',
  'datePicker',
  'dateRangePicker',
  'inputOtp',
  'attachment',
  'radioGroup',
  'slider',
  'switchToggle',
  'checkbox',
  'button',
  'group',
  'array',
];

const VALID_BUTTON_VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost'];
const SAFE_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/** Validator keys whose bare value is a flag / custom message rather than a bound. */
const FLAG_KEYS: ReadonlySet<string> = new Set(['required', 'requiredTrue', 'email']);
const NUMBER_KEYS: ReadonlySet<string> = new Set([
  'minLength',
  'maxLength',
  'min',
  'max',
  'minRangeDays',
  'maxRangeDays',
  'minSelected',
  'maxSelected',
  'maxFileSizeMb',
  'maxFiles',
]);
const STRING_KEYS: ReadonlySet<string> = new Set(['pattern', 'minDate', 'maxDate']);

/**
 * Reads and statically validates a developer-authored `bp.models/<name>.ts`
 * file, returning its exported `FieldModelEntry[]`.
 *
 * **Deliberately never `require()`/dynamically `import()`/`eval`s the file**
 * — it's arbitrary code living in the developer's own project, not generator
 * payload we control, so this parses it as source text via `ts-morph`
 * instead. This is a safety choice: do not "simplify" it to a runtime
 * `require` later.
 */
export function parseFieldModel(filePath: string): FieldModelEntry[] {
  if (!existsSync(filePath)) {
    throw new Error(
      `modules:form: model file not found at "${filePath}". Pass --model=<path to your bp.models/<name>.ts file>, relative to the project root.`,
    );
  }

  const project = new Project({ useInMemoryFileSystem: false });
  const sourceFile = project.addSourceFileAtPath(filePath);

  const arrayExports = sourceFile
    .getVariableStatements()
    .filter((s) => s.isExported())
    .flatMap((s) => s.getDeclarations())
    .filter((d) => d.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression) !== undefined);

  if (arrayExports.length === 0) {
    throw new Error(
      `modules:form: no exported array-literal variable found in "${filePath}". ` +
        `Expect a single top-level \`export const <anyName> = [...]\` (or \`: FieldModelEntry[] = [...]\`) listing your field descriptors.`,
    );
  }
  if (arrayExports.length > 1) {
    throw new Error(
      `modules:form: "${filePath}" exports ${arrayExports.length} array-literal variables (${arrayExports
        .map((d) => d.getName())
        .join(', ')}) — export exactly one.`,
    );
  }

  const arrayLiteral = arrayExports[0].getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);
  return parseEntries(arrayLiteral, '', filePath);
}

/**
 * Parses one sibling list (the top-level array, a group's `fields`, an
 * array's `itemTemplate`). `formControlName`s are unique per sibling list —
 * they're scoped to their parent group/row, so two groups may each have a
 * `street`. `where` is the breadcrumb prefix for error messages, empty at
 * the top level.
 */
function parseEntries(list: ArrayLiteralExpression, where: string, filePath: string): FieldModelEntry[] {
  const locate = (index: number) => (where ? `${where} > [${index}]` : `field index ${index}`);
  const entries = list.getElements().map((element, index) => parseEntry(element, locate(index), filePath));

  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    if (entry.type === 'button') return;
    if (seen.has(entry.formControlName)) {
      throw new Error(
        `modules:form: ${filePath}, ${locate(index)}: duplicate formControlName "${entry.formControlName}" — each control needs a unique name within its group/row/form.`,
      );
    }
    seen.add(entry.formControlName);
  });

  return entries;
}

/** Statically reads a literal value — string, number, boolean, null, array of literals, or a plain object of literals. Throws on anything needing evaluation. */
function readValue(expr: Expression): unknown {
  switch (expr.getKind()) {
    case SyntaxKind.StringLiteral:
      return expr.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue();
    case SyntaxKind.NoSubstitutionTemplateLiteral:
      return expr.asKindOrThrow(SyntaxKind.NoSubstitutionTemplateLiteral).getLiteralValue();
    case SyntaxKind.NumericLiteral:
      return expr.asKindOrThrow(SyntaxKind.NumericLiteral).getLiteralValue();
    case SyntaxKind.TrueKeyword:
      return true;
    case SyntaxKind.FalseKeyword:
      return false;
    case SyntaxKind.NullKeyword:
      return null;
    case SyntaxKind.PrefixUnaryExpression: {
      // A negative number literal (`-1`) parses as a PrefixUnaryExpression
      // wrapping a NumericLiteral, not as a single NumericLiteral node.
      const unary = expr.asKindOrThrow(SyntaxKind.PrefixUnaryExpression);
      const operand = unary.getOperand();
      if (unary.getOperatorToken() === SyntaxKind.MinusToken && operand.getKind() === SyntaxKind.NumericLiteral) {
        return -operand.asKindOrThrow(SyntaxKind.NumericLiteral).getLiteralValue();
      }
      throw new Error(`unsupported value \`${expr.getText()}\``);
    }
    case SyntaxKind.ArrayLiteralExpression:
      return expr
        .asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
        .getElements()
        .map((el) => readValue(el));
    case SyntaxKind.ObjectLiteralExpression: {
      const out: Record<string, unknown> = {};
      for (const prop of expr.asKindOrThrow(SyntaxKind.ObjectLiteralExpression).getProperties()) {
        const assignment = prop.asKind(SyntaxKind.PropertyAssignment);
        if (!assignment) {
          throw new Error(`unsupported object-literal construct \`${prop.getText()}\``);
        }
        out[assignment.getName().replace(/^['"]|['"]$/g, '')] = readValue(assignment.getInitializerOrThrow());
      }
      return out;
    }
    default:
      throw new Error(`unsupported value \`${expr.getText()}\``);
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseEntry(element: Expression, where: string, filePath: string): FieldModelEntry {
  const fail = (msg: string): never => {
    throw new Error(`modules:form: ${filePath}, ${where}: ${msg}`);
  };

  const obj = element.asKind(SyntaxKind.ObjectLiteralExpression);
  if (!obj) {
    return fail(
      `expected an object literal (\`{ type: ..., formControlName: ..., ... }\`), got \`${element.getText()}\`.`,
    );
  }

  const raw: Record<string, unknown> = {};
  // `fields` / `itemTemplate` are nested entry lists — kept as AST and
  // recursed into, not flattened through `readValue`.
  const nested: Record<string, Expression> = {};
  for (const prop of obj.getProperties()) {
    const assignment = prop.asKind(SyntaxKind.PropertyAssignment);
    if (!assignment) {
      // Covers shorthand (`{ label }`), spreads (`{ ...base }`), method
      // shorthand, and computed keys (`{ [x]: 1 }`) — none of these are
      // statically readable without evaluating arbitrary expressions, which
      // this parser deliberately never does.
      return fail(
        `unsupported object-literal construct \`${prop.getText()}\` — only plain \`key: <literal>\` properties are supported (no spreads, shorthand properties, computed keys, or method shorthand).`,
      );
    }
    const key = assignment.getName();
    const initializer = assignment.getInitializerOrThrow();
    if (key === 'fields' || key === 'itemTemplate') {
      nested[key] = initializer;
      continue;
    }
    try {
      raw[key] = readValue(initializer);
    } catch (e) {
      return fail(
        `property "${key}" uses an unsupported value \`${initializer.getText()}\` — only string, number, boolean and null literals (plus arrays/objects of them) are supported; no expressions, function calls, template interpolation, identifiers, or spreads. (${(e as Error).message})`,
      );
    }
  }

  const type = raw['type'];
  if (typeof type !== 'string' || !VALID_FIELD_TYPES.includes(type as FieldType)) {
    return fail(
      `unknown field type ${JSON.stringify(type)}${raw['formControlName'] ? ` (formControlName: "${raw['formControlName']}")` : ''}. Valid types: ${VALID_FIELD_TYPES.join(', ')}.`,
    );
  }

  for (const key of ['label'] as const) {
    if (typeof raw[key] !== 'string') fail(`missing or non-literal required string property "${key}".`);
  }
  for (const key of ['colSpan', 'colSpanSm', 'colSpanMd'] as const) {
    if (typeof raw[key] !== 'number') fail(`missing or non-literal required number property "${key}".`);
  }

  for (const key of ['fields', 'itemTemplate'] as const) {
    const owner = key === 'fields' ? 'group' : 'array';
    if (key in nested && type !== owner) {
      fail(`"${key}" only applies to \`type: '${owner}'\` — a ${type} entry can't have it.`);
    }
  }

  if (type === 'button') return parseButton(raw, fail);
  if (type === 'group') return parseGroup(raw, nested['fields'], where, filePath, fail);
  if (type === 'array') return parseArray(raw, nested['itemTemplate'], where, filePath, fail);
  return parseControl(raw, type as ControlFieldType, fail);
}

type Fail = (msg: string) => never;

function parseButton(raw: Record<string, unknown>, fail: Fail): ButtonFieldEntry {
  for (const forbidden of ['formControlName', 'validators', 'defaultValue']) {
    if (forbidden in raw) {
      fail(
        `a 'button' entry can't have "${forbidden}" — buttons aren't form-control-backed. (Did you mean a different \`type\`?)`,
      );
    }
  }

  const handler = raw['handler'];
  if (typeof handler !== 'string' || handler.length === 0) {
    fail(`a 'button' entry needs a non-empty string "handler" (the click-handler method name to stub out).`);
  }
  if (!SAFE_IDENTIFIER.test(handler as string)) {
    fail(
      `button handler ${JSON.stringify(handler)} isn't a safe identifier — it becomes a method name and a template click binding, so it must match ${SAFE_IDENTIFIER}.`,
    );
  }
  if (RESERVED_HANDLER_NAMES.includes(handler as string)) {
    fail(`button handler "${handler}" collides with a member the generated component already defines (${RESERVED_HANDLER_NAMES.join(', ')}).`);
  }

  const variant = raw['variant'];
  if (variant !== undefined && !VALID_BUTTON_VARIANTS.includes(variant as ButtonVariant)) {
    fail(`unknown button variant ${JSON.stringify(variant)}. Valid variants: ${VALID_BUTTON_VARIANTS.join(', ')}.`);
  }

  const entry: ButtonFieldEntry = {
    type: 'button',
    label: raw['label'] as string,
    handler: handler as string,
    colSpan: raw['colSpan'] as number,
    colSpanSm: raw['colSpanSm'] as number,
    colSpanMd: raw['colSpanMd'] as number,
  };
  if (variant !== undefined) entry.variant = variant as ButtonVariant;
  return entry;
}

function readNestedList(
  expr: Expression | undefined,
  key: 'fields' | 'itemTemplate',
  name: string,
  where: string,
  filePath: string,
  fail: Fail,
): FieldModelEntry[] {
  const owner = key === 'fields' ? 'group' : 'array';
  if (!expr) return fail(`"${name}" is missing "${key}" — a ${owner} needs a non-empty array literal of entries.`);
  const list = expr.asKind(SyntaxKind.ArrayLiteralExpression);
  if (!list) return fail(`"${name}": "${key}" must be an array literal of entries, got \`${expr.getText()}\`.`);
  if (list.getElements().length === 0) return fail(`"${name}": "${key}" is empty — it needs at least one entry.`);
  return parseEntries(list, `${where}, "${name}".${key}`, filePath);
}

function readContainerName(raw: Record<string, unknown>, type: 'group' | 'array', fail: Fail): string {
  if (typeof raw['formControlName'] !== 'string' || raw['formControlName'].length === 0) {
    fail(`a '${type}' entry needs a non-empty string "formControlName" (its key in the parent).`);
  }
  const name = raw['formControlName'] as string;
  if (!SAFE_IDENTIFIER.test(name)) {
    fail(
      `formControlName ${JSON.stringify(name)} isn't a valid identifier — it becomes part of generated member names, so it must match ${SAFE_IDENTIFIER}.`,
    );
  }
  for (const forbidden of ['validators', 'defaultValue', 'handler', 'variant']) {
    if (forbidden in raw) {
      fail(`"${name}" (${type}) can't have "${forbidden}" — ${type} entries carry no validators/defaults of their own.`);
    }
  }
  return name;
}

function parseGroup(
  raw: Record<string, unknown>,
  fieldsExpr: Expression | undefined,
  where: string,
  filePath: string,
  fail: Fail,
): GroupFieldEntry {
  const name = readContainerName(raw, 'group', fail);
  for (const key of Object.keys(raw)) {
    if (!['type', 'formControlName', 'label', 'colSpan', 'colSpanSm', 'colSpanMd'].includes(key)) {
      fail(`"${name}" (group) has unknown property "${key}".`);
    }
  }
  const fields = readNestedList(fieldsExpr, 'fields', name, where, filePath, fail);
  return {
    type: 'group',
    formControlName: name,
    label: raw['label'] as string,
    colSpan: raw['colSpan'] as number,
    colSpanSm: raw['colSpanSm'] as number,
    colSpanMd: raw['colSpanMd'] as number,
    fields,
  };
}

const ARRAY_OPTION_KEYS = [
  'minItems',
  'maxItems',
  'addButtonLabel',
  'removeButtonLabel',
  'addButtonVariant',
  'removeButtonVariant',
] as const;

function parseArray(
  raw: Record<string, unknown>,
  templateExpr: Expression | undefined,
  where: string,
  filePath: string,
  fail: Fail,
): ArrayFieldEntry {
  const name = readContainerName(raw, 'array', fail);
  const allowed: string[] = ['type', 'formControlName', 'label', 'colSpan', 'colSpanSm', 'colSpanMd', ...ARRAY_OPTION_KEYS];
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) fail(`"${name}" (array) has unknown property "${key}".`);
  }

  for (const key of ['minItems', 'maxItems'] as const) {
    const v = raw[key];
    if (v !== undefined && !(typeof v === 'number' && Number.isInteger(v) && v >= 0)) {
      fail(`"${name}": "${key}" must be a non-negative integer, got ${JSON.stringify(v)}.`);
    }
  }
  const minItems = raw['minItems'] as number | undefined;
  const maxItems = raw['maxItems'] as number | undefined;
  if (maxItems !== undefined && maxItems < 1) {
    fail(`"${name}": "maxItems" must be at least 1 (an array always starts with one row).`);
  }
  if (minItems !== undefined && maxItems !== undefined && minItems > maxItems) {
    fail(`"${name}": minItems (${minItems}) is greater than maxItems (${maxItems}).`);
  }
  for (const key of ['addButtonLabel', 'removeButtonLabel'] as const) {
    if (raw[key] !== undefined && typeof raw[key] !== 'string') fail(`"${name}": "${key}" must be a string.`);
  }
  for (const key of ['addButtonVariant', 'removeButtonVariant'] as const) {
    if (raw[key] !== undefined && !VALID_BUTTON_VARIANTS.includes(raw[key] as ButtonVariant)) {
      fail(`"${name}": unknown ${key} ${JSON.stringify(raw[key])}. Valid variants: ${VALID_BUTTON_VARIANTS.join(', ')}.`);
    }
  }

  const itemTemplate = readNestedList(templateExpr, 'itemTemplate', name, where, filePath, fail);
  const entry: ArrayFieldEntry = {
    type: 'array',
    formControlName: name,
    label: raw['label'] as string,
    colSpan: raw['colSpan'] as number,
    colSpanSm: raw['colSpanSm'] as number,
    colSpanMd: raw['colSpanMd'] as number,
    itemTemplate,
  };
  for (const key of ARRAY_OPTION_KEYS) {
    if (raw[key] !== undefined) (entry as unknown as Record<string, unknown>)[key] = raw[key];
  }
  return entry;
}

function parseControl(raw: Record<string, unknown>, type: ControlFieldType, fail: Fail): ControlFieldEntry {
  if (typeof raw['formControlName'] !== 'string' || raw['formControlName'].length === 0) {
    fail(`missing or non-literal required string property "formControlName".`);
  }
  const name = raw['formControlName'] as string;
  if (!SAFE_IDENTIFIER.test(name)) {
    fail(
      `formControlName ${JSON.stringify(name)} isn't a valid identifier — some renderers read it as \`form.controls.<name>\`, so it must match ${SAFE_IDENTIFIER}.`,
    );
  }

  if ('handler' in raw || 'variant' in raw) {
    fail(`"${name}" (${type}) has "handler"/"variant", which only apply to \`type: 'button'\`.`);
  }

  if ('validators' in raw) checkValidators(raw['validators'], type, name, fail);
  if ('defaultValue' in raw) checkDefaultValue(raw['defaultValue'], type, name, fail);

  const entry: Record<string, unknown> = {
    type,
    formControlName: name,
    label: raw['label'],
    colSpan: raw['colSpan'],
    colSpanSm: raw['colSpanSm'],
    colSpanMd: raw['colSpanMd'],
  };
  if ('defaultValue' in raw) entry['defaultValue'] = raw['defaultValue'];
  if ('validators' in raw) entry['validators'] = raw['validators'];
  return entry as unknown as ControlFieldEntry;
}

function checkValidators(validators: unknown, type: ControlFieldType, name: string, fail: Fail): void {
  const where = `"${name}" (${type})`;
  if (!isPlainObject(validators)) fail(`${where}: "validators" must be an object literal.`);
  const allowed = VALID_VALIDATOR_KEYS[type];

  for (const [key, value] of Object.entries(validators as Record<string, unknown>)) {
    if (!allowed.includes(key)) {
      fail(
        `${where}: validator "${key}" isn't valid for a ${type} field. Valid validators for ${type}: ${allowed.join(', ')}.`,
      );
    }

    if (FLAG_KEYS.has(key)) {
      if (typeof value !== 'boolean' && typeof value !== 'string') {
        fail(`${where}: validator "${key}" must be \`true\`, \`false\`, or a custom message string.`);
      }
      continue;
    }

    // Value keys: a bare value, or `{ value, message? }`.
    let bound: unknown = value;
    if (isPlainObject(value)) {
      for (const k of Object.keys(value)) {
        if (k !== 'value' && k !== 'message') {
          fail(`${where}: validator "${key}" object has unknown property "${k}" (only "value" and "message").`);
        }
      }
      if (!('value' in value)) fail(`${where}: validator "${key}" object needs a "value".`);
      if ('message' in value && typeof value['message'] !== 'string') {
        fail(`${where}: validator "${key}" message must be a string.`);
      }
      bound = value['value'];
    }

    if (NUMBER_KEYS.has(key) && typeof bound !== 'number') {
      fail(`${where}: validator "${key}" needs a number (or { value: <number>, message? }), got ${JSON.stringify(bound)}.`);
    }
    if (STRING_KEYS.has(key) && typeof bound !== 'string') {
      fail(`${where}: validator "${key}" needs a string (or { value: <string>, message? }), got ${JSON.stringify(bound)}.`);
    }
    if (key === 'allowedExtensions' && !(Array.isArray(bound) && bound.every((e) => typeof e === 'string'))) {
      fail(`${where}: validator "allowedExtensions" needs a string array (or { value: <string[]>, message? }).`);
    }
    if (key === 'pattern') {
      try {
        new RegExp(bound as string);
      } catch {
        fail(`${where}: validator "pattern" ${JSON.stringify(bound)} isn't a valid regular expression.`);
      }
    }
  }
}

/** A `typeof`-level sanity check that `defaultValue` fits the field's value family — scaffolding convenience, not a correctness fence, so deliberately light. */
function checkDefaultValue(value: unknown, type: ControlFieldType, name: string, fail: Fail): void {
  const where = `"${name}" (${type})`;
  const mismatch = (expected: string) =>
    fail(`${where}: defaultValue ${JSON.stringify(value)} doesn't fit a ${type} field — expected ${expected}.`);

  switch (type) {
    case 'textInput':
    case 'inputOtp':
    case 'select':
    case 'combobox':
    case 'radioGroup':
      if (typeof value !== 'string') mismatch('a string');
      break;
    case 'timePicker':
      if (typeof value !== 'string' && value !== null) mismatch("a string (e.g. '09:30') or null");
      break;
    case 'numberInput':
      if (typeof value !== 'number') mismatch('a number');
      break;
    case 'slider':
      if (typeof value !== 'number') mismatch('a number');
      break;
    case 'switchToggle':
    case 'checkbox':
      if (typeof value !== 'boolean') mismatch('a boolean');
      break;
    case 'selectMultiple':
    case 'comboboxMultiple':
      if (!(Array.isArray(value) && value.every((v) => typeof v === 'string'))) mismatch('a string array');
      break;
    case 'datePicker':
    case 'dateRangePicker':
    case 'attachment':
      // No literal can represent a Date / date tuple / File[] — only "empty" is expressible.
      if (value !== null) mismatch('null (dates and files have no literal form)');
      break;
  }
}
