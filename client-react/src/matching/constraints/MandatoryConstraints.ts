import { Student } from '../../types'
import { idMappingService } from '../../services/IdMappingService'

export function createMandatoryConstraints(students: Student[], projectIds: string[]): string[] {
  const studentNumIds = students.map(s => idMappingService.getNumericalId(s.id))
  const projectNumIds = projectIds.map(id => idMappingService.getNumericalId(id))

  const intConstraints = studentNumIds.flatMap(sId =>
    projectNumIds.map(pId => `int x${sId}y${pId}`)
  )

  const oneStudentConstraints = studentNumIds.map(
    sId => projectNumIds.map(pId => `x${sId}y${pId}`).join(' + ') + ' = 1'
  )

  return [...intConstraints, ...oneStudentConstraints]
}
