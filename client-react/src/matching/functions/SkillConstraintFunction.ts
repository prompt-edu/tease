import { Student, Skill, Operator, SkillProficiency } from '../../types'
import { SkillLevels } from '../../lib/utils'
import { ConstraintFunction, PropertySelectGroup, SelectData } from './ConstraintFunction'

const Comparator: Record<Operator, (a: number, b: number) => boolean> = {
  [Operator.EQUALS]: (a, b) => a === b,
  [Operator.GREATER_THAN_OR_EQUAL]: (a, b) => a >= b,
  [Operator.LESS_THAN_OR_EQUAL]: (a, b) => a <= b,
  [Operator.NOT_EQUALS]: (a, b) => a !== b,
}

export class SkillConstraintFunction extends ConstraintFunction {
  constructor(students: Student[], skills: Skill[]) {
    super(students, skills, 'Skill')
  }

  filterStudentsByConstraintFunction(property: string, operator: Operator, value: string): Student[] {
    return this.students.filter(s =>
      s.skills.some(sk => {
        if (sk.id !== property) return false
        return Comparator[operator](SkillLevels[sk.proficiency], SkillLevels[value as SkillProficiency])
      }),
    )
  }

  getProperties(): PropertySelectGroup {
    return {
      name: 'Skills',
      constraintFunction: this,
      values: this.skills.map(s => ({ id: s.id, name: s.title })),
    }
  }

  getValues(): SelectData[] {
    return Object.values(SkillProficiency).map(p => ({ id: p, name: p }))
  }
}
