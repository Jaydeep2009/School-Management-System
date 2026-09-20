/**
 * Marks Grading & Calculation
 * 
 * Pure calculation logic for marks aggregation and weighted scoring
 * This module is deterministic and independent of database/authorization
 */

import type { MarkStatus } from './marks.types';

export interface GradedAssessment {
  marks_obtained: number | null;
  status: MarkStatus;
  max_marks: number;
  weightage: number | null;
}

/**
 * Calculate weighted contribution for a single assessment
 * 
 * Formula: (marks_obtained / max_marks) × weightage
 * 
 * Returns null if:
 * - status is not 'graded'
 * - marks_obtained is null
 * - weightage is null
 */
export function calculateWeightedContribution(
  marksObtained: number | null,
  maxMarks: number,
  weightage: number | null,
  status: MarkStatus
): number | null {
  if (status !== 'graded' || marksObtained === null || weightage === null) {
    return null;
  }

  if (maxMarks === 0) {
    return null;
  }

  return (marksObtained / maxMarks) * weightage;
}

/**
 * Calculate percentage for a single assessment
 * 
 * Formula: (marks_obtained / max_marks) × 100
 * 
 * Returns null if:
 * - status is not 'graded'
 * - marks_obtained is null
 */
export function calculatePercentage(
  marksObtained: number | null,
  maxMarks: number,
  status: MarkStatus
): number | null {
  if (status !== 'graded' || marksObtained === null) {
    return null;
  }

  if (maxMarks === 0) {
    return null;
  }

  return (marksObtained / maxMarks) * 100;
}

/**
 * Calculate aggregate weighted marks for multiple assessments
 * 
 * Returns:
 * - total_weighted: sum of all weighted contributions
 * - total_weightage: sum of all weightages for graded assessments
 * 
 * Absent/exempt assessments are excluded from aggregation
 */
export function calculateAggregateWeighted(
  assessments: GradedAssessment[]
): {
  total_weighted: number | null;
  total_weightage: number | null;
} {
  let totalWeighted = 0;
  let totalWeightage = 0;
  let hasGraded = false;

  for (const assessment of assessments) {
    const contribution = calculateWeightedContribution(
      assessment.marks_obtained,
      assessment.max_marks,
      assessment.weightage,
      assessment.status
    );

    if (contribution !== null && assessment.weightage !== null) {
      totalWeighted += contribution;
      totalWeightage += assessment.weightage;
      hasGraded = true;
    }
  }

  if (!hasGraded) {
    return {
      total_weighted: null,
      total_weightage: null,
    };
  }

  return {
    total_weighted: Math.round(totalWeighted * 100) / 100, // Round to 2 decimals
    total_weightage: Math.round(totalWeightage * 100) / 100,
  };
}

/**
 * Calculate aggregate percentage for multiple assessments
 * 
 * Formula: (sum of marks_obtained / sum of max_marks) × 100
 * 
 * Only includes graded assessments
 * Absent/exempt assessments are excluded
 */
export function calculateAggregatePercentage(
  assessments: GradedAssessment[]
): number | null {
  let totalObtained = 0;
  let totalMax = 0;
  let hasGraded = false;

  for (const assessment of assessments) {
    if (assessment.status === 'graded' && assessment.marks_obtained !== null) {
      totalObtained += assessment.marks_obtained;
      totalMax += assessment.max_marks;
      hasGraded = true;
    }
  }

  if (!hasGraded || totalMax === 0) {
    return null;
  }

  return Math.round((totalObtained / totalMax) * 10000) / 100; // Round to 2 decimals
}
