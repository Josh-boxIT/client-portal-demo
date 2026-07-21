import OpenAI from 'openai';
import type { ChurnAssessment } from '@/data/seed/customerChurn';
import { CHURN_INVOICE_TERMS_DAYS } from './scoring';

export interface ChurnNarrativeInput {
  tenantId: string;
  tenantName: string;
  assessment: ChurnAssessment;
  safetyIdentifier: string;
  signal?: AbortSignal;
}

export interface ChurnNarrativeResult {
  assessment: string;
  suggestedActions: string;
}

export interface ChurnNarrativeProvider {
  readonly modelName: string;
  generate(input: ChurnNarrativeInput): Promise<ChurnNarrativeResult>;
}

export const CHURN_NARRATIVE_PROMPT_VERSION = '2';

export const CHURN_NARRATIVE_INSTRUCTIONS = `You write concise customer-retention assessments for MSP administrators.

Use only the supplied deterministic score and account metrics. Treat the metrics as the account's current business data. Do not change or recalculate the score. Explain the strongest risk and protective signals. Discuss business conditions only; omit commentary about data collection, provenance, completeness, or internal implementation. Suggest practical account-owner actions. Return two short paragraphs without markdown.`;

export function buildChurnNarrativeModelInput(input: ChurnNarrativeInput) {
  return {
    account: { name: input.tenantName },
    score: input.assessment.score,
    metrics: {
      accountAgeYears: input.assessment.accountAgeYears,
      creditLimitUsagePercent: input.assessment.creditLimitUsagePercent,
      daysPastDue: input.assessment.daysPastDue,
      onTimePaymentRatio: input.assessment.onTimePaymentRatio,
      slaConformancePercent: input.assessment.slaConformancePercent,
      openCases: input.assessment.openCases,
      closedCases: input.assessment.closedCases,
      repeatCases: input.assessment.repeatCases,
    },
    windowDays: 90,
    paymentTermsDays: CHURN_INVOICE_TERMS_DAYS,
  };
}

const OUTPUT_FORMAT = {
  type: 'json_schema' as const,
  name: 'customer_churn_narrative',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      assessment: { type: 'string' },
      suggested_actions: { type: 'string' },
    },
    required: ['assessment', 'suggested_actions'],
  },
};

export class OpenAIChurnNarrativeProvider implements ChurnNarrativeProvider {
  private readonly client: OpenAI;
  readonly modelName: string;

  constructor(
    apiKey: string,
    model: string,
    private readonly reasoningEffort: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max',
  ) {
    this.client = new OpenAI({ apiKey });
    this.modelName = model;
  }

  async generate(input: ChurnNarrativeInput): Promise<ChurnNarrativeResult> {
    const response = await this.client.responses.create({
      model: this.modelName,
      instructions: CHURN_NARRATIVE_INSTRUCTIONS,
      input: JSON.stringify(buildChurnNarrativeModelInput(input)),
      text: { format: OUTPUT_FORMAT, verbosity: 'low' },
      reasoning: { effort: this.reasoningEffort },
      max_output_tokens: 1_200,
      safety_identifier: input.safetyIdentifier,
      store: false,
    }, { signal: input.signal });
    const parsed = JSON.parse(response.output_text) as {
      assessment?: unknown;
      suggested_actions?: unknown;
    };
    if (typeof parsed.assessment !== 'string' || typeof parsed.suggested_actions !== 'string') {
      throw new Error('The churn narrative model returned an invalid response.');
    }
    return {
      assessment: parsed.assessment.trim(),
      suggestedActions: parsed.suggested_actions.trim(),
    };
  }
}
