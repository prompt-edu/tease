import { Student } from '../../types'
import { idMappingService } from '../../services/IdMappingService'

export function createCostFunction(students: Student[]): string {
  const terms = students.flatMap(student => {
    const sNumId = idMappingService.getNumericalId(student.id)
    const prefCount = student.projectPreferences.length
    return student.projectPreferences.map(pref => {
      const pNumId = idMappingService.getNumericalId(pref.projectId)
      const cost = prefCount - pref.priority
      return `${cost} x${sNumId}y${pNumId}`
    })
  })
  return `max: ${terms.join(' + ')}`
}
