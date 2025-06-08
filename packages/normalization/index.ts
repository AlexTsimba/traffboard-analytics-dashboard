// Input data interfaces
export interface RawConversionData {
  [key: string]: any;
}

export interface RawPlayerData {
  [key: string]: any;
}

// Normalized output interfaces
export interface NormalizedConversion {
  date: string;
  foreignPartnerId: number;
  foreignCampaignId: number;
  foreignLandingId: number;
  osFamily?: string;
  country: string;
  allClicks?: number;
  uniqueClicks?: number;
  registrationsCount?: number;
  ftdCount?: number;
}

export interface NormalizedPlayer {
  playerId: number;
  originalPlayerId?: number;
  signUpDate?: string;
  firstDepositDate?: string;
  campaignId?: number;
  campaignName?: string;
  playerCountry?: string;
  partnerId: number;
  companyName?: string;
  partnersEmail?: string;
  partnerTags?: string;
  promoId?: number;
  promoCode?: string;
  prequalified?: boolean;
  duplicate?: boolean;
  selfExcluded?: boolean;
  disabled?: boolean;
  currency?: string;
  ftdCount?: number;
  ftdSum?: number;
  depositsCount?: number;
  depositsSum?: number;
  cashoutsCount?: number;
  cashoutsSum?: number;
  casinoBetsCount?: number;
  casinoRealNgr?: number;
  fixedPerPlayer?: number;
  casinoBetsSum?: number;
  casinoWinsSum?: number;
  date: string;
}

// Error types
export class NormalizationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    public readonly partnerId?: number
  ) {
    super(message);
    this.name = 'NormalizationError';
  }
}

export class ValidationError extends NormalizationError {
  constructor(field: string, value: any, rule: string, partnerId?: number) {
    super(`Validation failed for field ${field}: ${rule}`, field, value, partnerId);
    this.name = 'ValidationError';
  }
}

export * from './fieldMapper';
export * from './validator';
export * from './normalizer';
export * from './pipeline';
