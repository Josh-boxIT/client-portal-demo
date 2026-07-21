import {
  churnAssessments,
  getChurnAssessment,
} from '@/data/seed/customerChurn';

export { churnAssessments, getChurnAssessment };

export interface ChurnRiskTone {
  label: string;
  badgeClass: string;
  scoreClass: string;
  ring: string;
}

export function getRiskTone(score: number): ChurnRiskTone {
  if (score >= 80) {
    return {
      label: 'Critical risk',
      badgeClass: 'border-red-200 bg-red-100 text-red-800',
      scoreClass: 'text-red-600',
      ring: '#dc2626',
    };
  }
  if (score >= 60) {
    return {
      label: 'High risk',
      badgeClass: 'border-orange-200 bg-orange-100 text-orange-800',
      scoreClass: 'text-orange-600',
      ring: '#ea580c',
    };
  }
  if (score >= 30) {
    return {
      label: 'Moderate risk',
      badgeClass: 'border-amber-200 bg-amber-100 text-amber-800',
      scoreClass: 'text-amber-600',
      ring: '#d97706',
    };
  }
  return {
    label: 'Low risk',
    badgeClass: 'border-green-200 bg-green-100 text-green-800',
    scoreClass: 'text-green-600',
    ring: '#16a34a',
  };
}

export function formatAssessmentDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export function churnSourceLabel(source: 'connectwise' | 'demo'): string {
  return source === 'connectwise' ? 'Live CW' : 'Demo';
}
