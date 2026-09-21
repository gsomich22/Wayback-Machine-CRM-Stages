import { readFileSync } from 'node:fs';
export const DEFAULT_STAGE_RULES = Object.freeze(JSON.parse(readFileSync(new URL('../config/stage-rules.json', import.meta.url), 'utf8')));
export function stageRules(overrides = {}) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw new Error('stage rules must be an object');
  for (const key of Object.keys(overrides)) if (!(key in DEFAULT_STAGE_RULES)) throw new Error(`Unknown stage rule: ${key}`);
  const rules = {...DEFAULT_STAGE_RULES, ...overrides};
  for (const [key, value] of Object.entries(rules)) {
    if (!Number.isInteger(value) || value < (key === 'otherSignalExpiryMonths' ? 1 : 0)) throw new Error(`${key} must be a valid nonnegative whole month count`);
  }
  if (rules.staleRebuildMaxAgeMonths < rules.freshRebuildMaxAgeMonths) throw new Error('staleRebuildMaxAgeMonths must be at least freshRebuildMaxAgeMonths');
  return rules;
}
