// Placeholder – generated from the literature review (see scripts/build-evidence.py).
import type { Targets } from './muscles';

export interface Variant {
  key: string;
  labelDe: string;
  labelEn: string;
  targets: Targets;
  basis: 'hypertrophy' | 'emg' | 'biomech' | 'mixed';
  summaryDe: string;
  sourceIds: string[];
}
export interface Evidence { variants: Variant[]; myths: string[] }
export interface Source { cite: string; url: string; type: string; finding: string }

export const EVIDENCE: Record<string, Evidence> = {};
export const SOURCES: Record<string, Source> = {};
/** Execution the user described, per exercise key. */
export const USER_VARIANTS: Record<string, string> = {};
