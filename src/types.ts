export interface Unit {
  unit: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  value: number;
  tier1Value: number;
  tier2Value: number;
}

export interface ReportMetadata {
  condominium: string;
  address: string;
  referenceMonth: string;
}

export interface ExtractionResult {
  metadata: ReportMetadata;
  units: Unit[];
}

export const TARIFF_RULES = {
  ZERO: 0,
  LOW_TIER_LIMIT: 15,
  LOW_TIER_PRICE: 14.82,
  HIGH_TIER_PRICE: 32.62,
};
