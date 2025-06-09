import { db } from '@traffboard/database';
import { partnerSettings } from '@traffboard/database';
import { eq } from 'drizzle-orm';
import { FieldMapper, DateConverter } from './fieldMapper';
import { DataValidator } from './validator';
import { DimensionNormalizer } from './dimensionNormalizer';
import type { 
  RawConversionData, 
  RawPlayerData, 
  NormalizedConversion, 
  NormalizedPlayer 
} from './index';
import { NormalizationError, ValidationError } from './index';

export class PartnerDataNormalizer {
  private fieldMapper?: FieldMapper;
  private dateConverter?: DateConverter;
  private validator?: DataValidator;
  private dimensionNormalizer?: DimensionNormalizer;
  private partnerId?: number;

  async loadPartnerSettings(partnerId: number): Promise<void> {
    const [settings] = await db
      .select()
      .from(partnerSettings)
      .where(eq(partnerSettings.partnerId, partnerId));

    if (!settings) {
      throw new NormalizationError(`Partner settings not found for ID: ${partnerId}`);
    }

    if (!settings.isActive) {
      throw new NormalizationError(`Partner ${partnerId} is not active`);
    }

    this.partnerId = partnerId;
    
    if (settings.fieldMappings) {
      this.fieldMapper = new FieldMapper(settings.fieldMappings);
    }
    
    if (settings.dateFormats) {
      this.dateConverter = new DateConverter(settings.dateFormats);
    }
    
    if (settings.validationRules) {
      this.validator = new DataValidator(settings.validationRules);
    }

    if (settings.dimensionMappings) {
      this.dimensionNormalizer = new DimensionNormalizer(
        partnerId, 
        settings.partnerName, 
        settings.dimensionMappings
      );
    }
  }

  async normalizeConversion(rawData: RawConversionData): Promise<NormalizedConversion> {
    if (!this.partnerId) {
      throw new NormalizationError('Partner settings not loaded');
    }

    try {
      // Apply field mapping
      let mapped = rawData;
      if (this.fieldMapper) {
        mapped = this.fieldMapper.mapFields(rawData, 'conversions');
      }

      // Validate data
      if (this.validator) {
        this.validator.validate(mapped, this.partnerId);
      }

      // Convert dates
      if (mapped.date && this.dateConverter) {
        mapped.date = this.dateConverter.convertDate(mapped.date);
      }

      // Normalize dimensions
      let dimensions: { buyerId: number | null; funnelId: number | null; sourceId: number | null; campaignId: number | null } = { 
        buyerId: null, 
        funnelId: null, 
        sourceId: null, 
        campaignId: null 
      };
      if (this.dimensionNormalizer) {
        dimensions = await this.dimensionNormalizer.normalizeAllDimensions(mapped);
      }

      // Apply data type conversions and defaults
      const normalized: NormalizedConversion = {
        date: mapped.date || new Date().toISOString().split('T')[0],
        foreignPartnerId: Number(mapped.foreignPartnerId || mapped.partner_id || 0),
        foreignCampaignId: Number(mapped.foreignCampaignId || mapped.campaign_id || 0),
        foreignLandingId: Number(mapped.foreignLandingId || mapped.landing_id || 0),
        country: String(mapped.country || 'US'),
        osFamily: mapped.osFamily || mapped.os_family,
        allClicks: mapped.allClicks ? Number(mapped.allClicks) : 0,
        uniqueClicks: mapped.uniqueClicks ? Number(mapped.uniqueClicks) : 0,
        registrationsCount: mapped.registrationsCount ? Number(mapped.registrationsCount) : 0,
        ftdCount: mapped.ftdCount ? Number(mapped.ftdCount) : 0,
        // Add normalized dimension references
        buyerId: dimensions.buyerId,
        funnelId: dimensions.funnelId,
        sourceId: dimensions.sourceId,
        campaignId: dimensions.campaignId,
      };

      return normalized;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NormalizationError) {
        throw error;
      }
      throw new NormalizationError(`Conversion normalization failed: ${error}`);
    }
  }

  async normalizePlayer(rawData: RawPlayerData): Promise<NormalizedPlayer> {
    if (!this.partnerId) {
      throw new NormalizationError('Partner settings not loaded');
    }

    try {
      // Apply field mapping
      let mapped = rawData;
      if (this.fieldMapper) {
        mapped = this.fieldMapper.mapFields(rawData, 'players');
      }

      // Validate data
      if (this.validator) {
        this.validator.validate(mapped, this.partnerId);
      }

      // Convert dates
      if (mapped.signUpDate && this.dateConverter) {
        mapped.signUpDate = this.dateConverter.convertDate(mapped.signUpDate);
      }
      if (mapped.firstDepositDate && this.dateConverter) {
        mapped.firstDepositDate = this.dateConverter.convertDate(mapped.firstDepositDate);
      }
      if (mapped.date && this.dateConverter) {
        mapped.date = this.dateConverter.convertDate(mapped.date);
      }

      // Apply data type conversions and defaults
      const normalized: NormalizedPlayer = {
        playerId: Number(mapped.playerId || mapped.player_id),
        originalPlayerId: mapped.originalPlayerId ? Number(mapped.originalPlayerId) : undefined,
        signUpDate: mapped.signUpDate || mapped.sign_up_date,
        firstDepositDate: mapped.firstDepositDate || mapped.first_deposit_date,
        campaignId: mapped.campaignId ? Number(mapped.campaignId) : undefined,
        campaignName: mapped.campaignName || mapped.campaign_name,
        playerCountry: mapped.playerCountry || mapped.player_country,
        partnerId: Number(this.partnerId),
        companyName: mapped.companyName || mapped.company_name,
        partnersEmail: mapped.partnersEmail || mapped.partners_email,
        partnerTags: mapped.partnerTags || mapped.partner_tags,
        promoId: mapped.promoId ? Number(mapped.promoId) : undefined,
        promoCode: mapped.promoCode || mapped.promo_code,
        prequalified: Boolean(mapped.prequalified),
        duplicate: Boolean(mapped.duplicate),
        selfExcluded: Boolean(mapped.selfExcluded || mapped.self_excluded),
        disabled: Boolean(mapped.disabled),
        currency: mapped.currency,
        ftdCount: mapped.ftdCount ? Number(mapped.ftdCount) : 0,
        ftdSum: mapped.ftdSum ? String(mapped.ftdSum) : '0',
        depositsCount: mapped.depositsCount ? Number(mapped.depositsCount) : 0,
        depositsSum: mapped.depositsSum ? String(mapped.depositsSum) : '0',
        cashoutsCount: mapped.cashoutsCount ? Number(mapped.cashoutsCount) : 0,
        cashoutsSum: mapped.cashoutsSum ? String(mapped.cashoutsSum) : '0',
        casinoBetsCount: mapped.casinoBetsCount ? Number(mapped.casinoBetsCount) : 0,
        casinoRealNgr: mapped.casinoRealNgr ? String(mapped.casinoRealNgr) : '0',
        fixedPerPlayer: mapped.fixedPerPlayer ? String(mapped.fixedPerPlayer) : '0',
        casinoBetsSum: mapped.casinoBetsSum ? String(mapped.casinoBetsSum) : '0',
        casinoWinsSum: mapped.casinoWinsSum ? String(mapped.casinoWinsSum) : '0',
        date: mapped.date || new Date().toISOString().split('T')[0],
      };

      return normalized;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NormalizationError) {
        throw error;
      }
      throw new NormalizationError(`Player normalization failed: ${error}`);
    }
  }
}
