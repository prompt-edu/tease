import { Student, Skill, Operator } from '../../types'
import { ConstraintFunction, PropertySelectGroup, SelectData } from './ConstraintFunction'

export class TeamSizeConstraintFunction extends ConstraintFunction {
  constructor(students: Student[], skills: Skill[]) {
    super(students, skills, 'Team Size', [Operator.EQUALS])
  }

  filterStudentsByConstraintFunction(): Student[] {
    return this.students
  }

  getProperties(): PropertySelectGroup {
    return {
      name: 'Team Size',
      constraintFunction: this,
      values: [{ id: 'cf-team-size', name: 'Team Size' }],
    }
  }

  getValues(): SelectData[] {
    return [{ id: 'cf-team-size-default-value', name: 'true' }]
  }

  getDescription(): string {
    return 'Team Size'
  }
}
