import { Student, Skill, Operator, Device } from '../../types'
import { ConstraintFunction, PropertySelectGroup, SelectData } from './ConstraintFunction'

export class DeviceConstraintFunction extends ConstraintFunction {
  constructor(students: Student[], skills: Skill[]) {
    super(students, skills, 'Device', [Operator.EQUALS])
  }

  filterStudentsByConstraintFunction(_property: string, _operator: Operator, value: string): Student[] {
    return this.students.filter(s => s.devices.includes(value as Device))
  }

  getProperties(): PropertySelectGroup {
    return {
      name: 'Device',
      constraintFunction: this,
      values: [{ id: 'cf-device', name: 'Device' }],
    }
  }

  getValues(): SelectData[] {
    return Object.values(Device).map(d => ({ id: d, name: d }))
  }
}
