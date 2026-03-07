import { Student, Skill, Operator } from '../../types'
import { ConstraintFunction, PropertySelectGroup, SelectData } from './ConstraintFunction'

const Comparator: Record<Operator, (a: string, b: string) => boolean> = {
  [Operator.EQUALS]: (a, b) => a === b,
  [Operator.GREATER_THAN_OR_EQUAL]: (a, b) => a >= b,
  [Operator.LESS_THAN_OR_EQUAL]: (a, b) => a <= b,
  [Operator.NOT_EQUALS]: (a, b) => a !== b,
}

export class NationalityConstraintFunction extends ConstraintFunction {
  private nationalities: Set<string>

  constructor(students: Student[], skills: Skill[]) {
    super(students, skills, 'Nationality', [Operator.EQUALS, Operator.NOT_EQUALS])
    this.nationalities = new Set(students.map(s => s.nationality).filter(Boolean))
  }

  filterStudentsByConstraintFunction(_property: string, operator: Operator, value: string): Student[] {
    return this.students.filter(s => Comparator[operator](s.nationality, value))
  }

  getProperties(): PropertySelectGroup {
    return {
      name: 'Nationality',
      constraintFunction: this,
      values: [{ id: 'cf-nationality', name: 'Nationality' }],
    }
  }

  getValues(): SelectData[] {
    return Array.from(this.nationalities)
      .map(code => ({ id: code, name: code }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}
