export type FormCondition = {
  sourceFieldId?: string
  operator?: string
  value?: string
}

export type FormConditionGroup = {
  logicType?: string
  conditions?: FormCondition[]
}

export type FormConditionalRule = {
  type?: string
  targetFieldId?: string
  actionType?: string
  logicType?: string
  conditions?: FormCondition[]
  groups?: FormConditionGroup[]
}

function valuesInclude(value: unknown, expected: string): boolean {
  if (Array.isArray(value)) return value.map((v) => String(v)).includes(expected)
  return String(value ?? '') === expected
}

function conditionPasses(operator: string, currentValue: unknown, expectedValue: string): boolean {
  if (operator === 'isnot' || operator === 'is_not' || operator === '!=' || operator === 'not_equal') {
    return !valuesInclude(currentValue, expectedValue)
  }
  const current = String(currentValue ?? '')
  const expected = String(expectedValue ?? '')
  if (operator === 'greater_than' || operator === '>') {
    return Number(current) > Number(expected)
  }
  if (operator === 'less_than' || operator === '<') {
    return Number(current) < Number(expected)
  }
  if (operator === 'contains') {
    return current.toLowerCase().includes(expected.toLowerCase())
  }
  if (operator === 'starts_with') {
    return current.toLowerCase().startsWith(expected.toLowerCase())
  }
  if (operator === 'ends_with') {
    return current.toLowerCase().endsWith(expected.toLowerCase())
  }
  return valuesInclude(currentValue, expectedValue)
}

function groupMatches(
  logicType: string,
  conditions: FormCondition[],
  answers: Record<string, unknown>,
): boolean {
  if (!conditions.length) return true
  const results = conditions.map((condition) => {
    const sourceKey = String(condition?.sourceFieldId || '').trim()
    const operator = String(condition?.operator || 'is').toLowerCase()
    const expected = String(condition?.value || '')
    return conditionPasses(operator, answers[sourceKey], expected)
  })
  return logicType === 'any' ? results.some(Boolean) : results.every(Boolean)
}

function ruleMatches(rule: FormConditionalRule, answers: Record<string, unknown>): boolean {
  const groups = Array.isArray(rule.groups) && rule.groups.length
    ? rule.groups
    : [{ logicType: rule.logicType, conditions: rule.conditions }]
  return groups.every((group) =>
    groupMatches(
      String(group?.logicType || 'all').toLowerCase(),
      Array.isArray(group?.conditions) ? group.conditions : [],
      answers,
    ),
  )
}

/** Show rules for the same field must all match. Hide rules hide when they match. */
export function visibilityForFields(
  fieldIds: string[],
  rules: unknown[] | null | undefined,
  answers: Record<string, unknown>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const id of fieldIds) out[id] = true

  for (const raw of rules || []) {
    const rule = raw as FormConditionalRule
    if (!rule || rule.type !== 'gravityConditional') continue
    const target = String(rule.targetFieldId || '').trim()
    if (!target || !(target in out)) continue
    const groups = Array.isArray(rule.groups) ? rule.groups : []
    const conditions = Array.isArray(rule.conditions) ? rule.conditions : []
    const hasClause = groups.some((group) => Array.isArray(group?.conditions) && group.conditions.length) || conditions.length > 0
    if (!hasClause) continue
    const matches = ruleMatches(rule, answers)
    const action = String(rule.actionType || 'show').toLowerCase()
    out[target] = action === 'hide' ? out[target] && !matches : out[target] && matches
  }

  return out
}
