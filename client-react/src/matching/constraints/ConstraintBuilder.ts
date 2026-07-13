import { Student, ConstraintWrapper, StudentIdToProjectIdMapping } from '../../types'
import { createMandatoryConstraints } from './MandatoryConstraints'
import { createCustomConstraints } from './CustomConstraints'
import { createCostFunction } from './CostFunctions'
import { createLockedConstraints } from './LockedConstraints'

/**
 * Orchestrates all constraint sources into a flat string array
 * ready for the LP solver.
 */
export function buildConstraints(
  students: Student[],
  projectIds: string[],
  constraintWrappers: ConstraintWrapper[],
  locks: StudentIdToProjectIdMapping,
): string[] {
  return [
    ...createMandatoryConstraints(students, projectIds),
    ...createCustomConstraints(constraintWrappers),
    createCostFunction(students),
    ...createLockedConstraints(locks),
  ]
}
