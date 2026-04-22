import { Student, Skill, Operator, LanguageProficiency } from '../../types'
import { LanguageLevels } from '../../lib/utils'
import { ConstraintFunction, PropertySelectGroup, SelectData } from './ConstraintFunction'

const Comparator: Record<Operator, (a: number, b: number) => boolean> = {
  [Operator.EQUALS]: (a, b) => a === b,
  [Operator.GREATER_THAN_OR_EQUAL]: (a, b) => a >= b,
  [Operator.LESS_THAN_OR_EQUAL]: (a, b) => a <= b,
  [Operator.NOT_EQUALS]: (a, b) => a !== b,
}

export class LanguageConstraintFunction extends ConstraintFunction {
  constructor(students: Student[], skills: Skill[]) {
    super(students, skills, 'Language Proficiency')
  }

  filterStudentsByConstraintFunction(property: string, operator: Operator, value: string): Student[] {
    return this.students.filter(s => {
      const lang = s.languages.find(l => l.language === property)
      if (!lang) return false
      return Comparator[operator](
        LanguageLevels[lang.proficiency],
        LanguageLevels[value as LanguageProficiency],
      )
    })
  }

  getProperties(): PropertySelectGroup {
    return {
      name: 'Language Proficiency',
      constraintFunction: this,
      values: [
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ],
    }
  }

  getValues(): SelectData[] {
    return Object.values(LanguageProficiency).map(p => ({ id: p, name: p }))
  }
}
