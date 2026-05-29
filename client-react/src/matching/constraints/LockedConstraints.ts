import { StudentIdToProjectIdMapping } from '../../types'
import { idMappingService } from '../../services/IdMappingService'

export function createLockedConstraints(locks: StudentIdToProjectIdMapping): string[] {
  const constraints: string[] = []
  for (const [studentId, projectId] of locks.entries()) {
    const sNumId = idMappingService.getNumericalId(studentId)
    const pNumId = idMappingService.getNumericalId(projectId)
    constraints.push(`x${sNumId}y${pNumId} = 1`)
  }
  return constraints
}
