import { backlogIntelligenceSnapshot } from '@/data/seed/backlogIntelligence';
import type { BacklogIntelligenceService, BacklogIntelligenceSnapshot } from '../types';

export const mockBacklogIntelligenceService: BacklogIntelligenceService = {
  async getSnapshot(): Promise<BacklogIntelligenceSnapshot> {
    return structuredClone(backlogIntelligenceSnapshot);
  },
};
