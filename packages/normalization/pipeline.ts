import { db } from '@traffboard/database';
import { conversions, players } from '@traffboard/database';
import { PartnerDataNormalizer } from './normalizer';
import type { RawConversionData, RawPlayerData } from './index';

export interface ProcessingResult {
  success: boolean;
  processed: number;
  errors: Array<{
    index: number;
    error: string;
    data?: any;
  }>;
}

export class DataProcessingPipeline {
  private normalizer: PartnerDataNormalizer;
  
  constructor() {
    this.normalizer = new PartnerDataNormalizer();
  }

  async processConversions(
    partnerId: number, 
    rawData: RawConversionData[]
  ): Promise<ProcessingResult> {
    await this.normalizer.loadPartnerSettings(partnerId);
    
    const result: ProcessingResult = {
      success: true,
      processed: 0,
      errors: []
    };

    for (let i = 0; i < rawData.length; i++) {
      try {
        const record = rawData[i];
        if (!record) continue;
        
        const normalized = await this.normalizer.normalizeConversion(record);
        
        // Insert into database
        await db.insert(conversions).values(normalized);
        
        result.processed++;
      } catch (error) {
        result.success = false;
        result.errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: rawData[i]
        });
        
        // Log error for monitoring
        console.error(`Conversion processing error at index ${i}:`, error);
      }
    }

    return result;
  }

  async processPlayers(
    partnerId: number, 
    rawData: RawPlayerData[]
  ): Promise<ProcessingResult> {
    await this.normalizer.loadPartnerSettings(partnerId);
    
    const result: ProcessingResult = {
      success: true,
      processed: 0,
      errors: []
    };

    for (let i = 0; i < rawData.length; i++) {
      try {
        const record = rawData[i];
        if (!record) continue;
        
        const normalized = await this.normalizer.normalizePlayer(record);
        
        // Insert into database (with upsert on playerId)
        await db.insert(players).values(normalized);
        
        result.processed++;
      } catch (error) {
        result.success = false;
        result.errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: rawData[i]
        });
        
        console.error(`Player processing error at index ${i}:`, error);
      }
    }

    return result;
  }
}
