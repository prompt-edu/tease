import { ConstraintWrapper, Operator } from '../../types'
import { idMappingService } from '../../services/IdMappingService'

export function createCustomConstraints(wrappers: ConstraintWrapper[]): string[] {
  return wrappers
    .filter(w => w.isActive)
    .flatMap(wrapper => createConstraintsForWrapper(wrapper))
}

function createConstraintsForWrapper(wrapper: ConstraintWrapper): string[] {
  const { projectIds, constraintFunction: cf, threshold } = wrapper
  const constraints: string[] = []
  const studentIds = cf.studentIds

  for (const projectId of projectIds) {
    const pNumId = idMappingService.getNumericalId(projectId)
    const pairs = studentIds.map(sId => {
      const sNumId = idMappingService.getNumericalId(sId)
      return `x${sNumId}y${pNumId}`
    })
    const expr = pairs.join(' + ')
    constraints.push(`${expr} ${Operator.GREATER_THAN_OR_EQUAL} ${threshold.lowerBound}`)
    constraints.push(`${expr} ${Operator.LESS_THAN_OR_EQUAL} ${threshold.upperBound}`)
  }
  return constraints
}
