import { Student, Skill, Operator, SkillProficiency } from '../../types'
import { SkillLevels } from '../../lib/utils'
import { ConstraintFunction, PropertySelectGroup, SelectData } from './ConstraintFunction'

const Comparator: Record<Operator, (a: number, b: number) => boolean> = {
  [Operator.EQUALS]: (a, b) => a === b,
  [Operator.GREATER_THAN_OR_EQUAL]: (a, b) => a >= b,
  [Operator.LESS_THAN_OR_EQUAL]: (a, b) => a <= b,
  [Operator.NOT_EQUALS]: (a, b) => a !== b,
}

export class IntroCourseConstraintFunction extends ConstraintFunction {
  constructor(students: Student[], skills: Skill[]) {
    super(students, skills, 'Intro Course Proficiency')
  }

  filterStudentsByConstraintFunction(_property: string, operator: Operator, value: string): Student[] {
    return this.students.filter(s =>
      Comparator[operator](
        SkillLevels[s.introCourseProficiency],
        SkillLevels[value as SkillProficiency],
      ),
    )
  }

  getProperties(): PropertySelectGroup {
    return {
      name: 'Intro Course Proficiency',
      constraintFunction: this,
      values: [{ id: 'cf-intro-course-proficiency', name: 'Intro Course Proficiency' }],
    }
  }

  getValues(): SelectData[] {
    return Object.values(SkillProficiency).map(p => ({ id: p, name: p }))
  }
}
