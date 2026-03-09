import { Student, Skill, Operator, Gender } from '../../types'
import { ConstraintFunction, PropertySelectGroup, SelectData } from './ConstraintFunction'

const Comparator: Record<Operator, (a: string, b: string) => boolean> = {
  [Operator.EQUALS]: (a, b) => a === b,
  [Operator.GREATER_THAN_OR_EQUAL]: (a, b) => a >= b,
  [Operator.LESS_THAN_OR_EQUAL]: (a, b) => a <= b,
  [Operator.NOT_EQUALS]: (a, b) => a !== b,
}

export class GenderConstraintFunction extends ConstraintFunction {
  constructor(students: Student[], skills: Skill[]) {
    super(students, skills, 'Gender', [Operator.EQUALS, Operator.NOT_EQUALS])
  }

  filterStudentsByConstraintFunction(property: string, operator: Operator, value: string): Student[] {
    return this.students.filter(s => Comparator[operator](value, s.gender))
  }

  getProperties(): PropertySelectGroup {
    return {
      name: 'Gender',
      constraintFunction: this,
      values: [{ id: 'cf-gender', name: 'Gender' }],
    }
  }

  getValues(): SelectData[] {
    return Object.values(Gender).map(g => ({ id: g, name: g }))
  }
}
