import { fields, renderNote, noteTitle } from './adapters.mjs';
export function signalObject(r) {
  return {
    schema_version: 1,
    engine_version: r.engineVersion,
    domain: r.domain,
    website_activity_stage: r.state,
    ...fields(r),
    confidence: r.status !== 'complete' || !r.latestFinding ? 'low' : r.latestFinding.strength === 'strong' ? 'high' : 'medium',
    confidence_basis: 'Heuristic evidence strength, not a probability of a redesign or purchase.',
    summary: r.latestFinding ? `${r.state}. Latest finding: ${r.latestFinding.label}, ${r.latestFinding.start} to ${r.latestFinding.end}. ${r.latestFinding.reason}` : `${r.state}. No qualifying finding in the available archive evidence.`,
    detected_signals: r.signals,
    recommended_outreach_angle: r.reviewPrompt,
    note_title: noteTitle(r),
    note_markdown: renderNote(r),
    stage_rules: r.stageRules,
  };
}
