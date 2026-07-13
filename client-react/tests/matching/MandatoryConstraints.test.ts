import { describe, it, expect, beforeEach } from 'vitest'
import { createMandatoryConstraints } from '../../src/matching/constraints/MandatoryConstraints'
import { idMappingService } from '../../src/services/IdMappingService'
import { Student, Gender, SkillProficiency } from '../../src/types'

function makeStudent(id: string): Student {
  return {
    id, firstName: 'Test', lastName: 'Student', email: `${id}@test.com`,
    gender: Gender.Female, nationality: 'DE', studyProgram: 'CS', studyDegree: 'Bachelor',
    semester: 3, devices: [], languages: [],
    introSelfAssessment: SkillProficiency.Intermediate,
    introCourseProficiency: SkillProficiency.Intermediate,
    skills: [], projectPreferences: [], studentComments: [], tutorComments: [],
  }
}

describe('MandatoryConstraints', () => {
  beforeEach(() => {
    localStorage.clear()
    idMappingService.reset()
  })

  it('generates integer constraints for each student-project pair', () => {
    const constraints = createMandatoryConstraints(
      [makeStudent('s1'), makeStudent('s2')],
      ['p1', 'p2'],
    )
    expect(constraints.filter(c => c.startsWith('int '))).toHaveLength(4)
  })

  it('generates one-student-per-row constraints', () => {
    const constraints = createMandatoryConstraints([makeStudent('s1')], ['p1', 'p2', 'p3'])
    const oneOf = constraints.filter(c => c.endsWith('= 1'))
    expect(oneOf).toHaveLength(1)
    expect(oneOf[0].split('+').length).toBe(3)
  })
})
