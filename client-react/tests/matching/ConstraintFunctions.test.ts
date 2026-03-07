import { describe, it, expect } from 'vitest'
import { SkillConstraintFunction } from '../../src/matching/functions/SkillConstraintFunction'
import { GenderConstraintFunction } from '../../src/matching/functions/GenderConstraintFunction'
import { DeviceConstraintFunction } from '../../src/matching/functions/DeviceConstraintFunction'
import { Student, Gender, Device, Skill, SkillProficiency, Operator } from '../../src/types'

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: 'test-id',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@test.com',
    gender: Gender.Female,
    nationality: 'DE',
    studyProgram: 'CS',
    studyDegree: 'Bachelor',
    semester: 3,
    devices: [Device.IPhone],
    languages: [],
    introSelfAssessment: SkillProficiency.Intermediate,
    introCourseProficiency: SkillProficiency.Intermediate,
    skills: [{ id: 'skill-swift', proficiency: SkillProficiency.Advanced }],
    projectPreferences: [],
    studentComments: [],
    tutorComments: [],
    ...overrides,
  }
}

const skills: Skill[] = [{ id: 'skill-swift', title: 'Swift', description: '' }]

describe('GenderConstraintFunction', () => {
  const alice = makeStudent({ gender: Gender.Female })
  const bob = makeStudent({ id: 'bob', gender: Gender.Male })
  const fn = new GenderConstraintFunction([alice, bob], skills)

  it('filters by gender equals', () => {
    const result = fn.filterStudentsByConstraintFunction('cf-gender', Operator.EQUALS, Gender.Female)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('test-id')
  })

  it('filters by gender not equals', () => {
    const result = fn.filterStudentsByConstraintFunction('cf-gender', Operator.NOT_EQUALS, Gender.Female)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('bob')
  })
})

describe('DeviceConstraintFunction', () => {
  const student = makeStudent({ devices: [Device.IPhone, Device.Mac] })
  const fn = new DeviceConstraintFunction([student], skills)

  it('filters by device', () => {
    const result = fn.filterStudentsByConstraintFunction('cf-device', Operator.EQUALS, Device.IPhone)
    expect(result).toHaveLength(1)
  })

  it('returns empty when device not owned', () => {
    const result = fn.filterStudentsByConstraintFunction('cf-device', Operator.EQUALS, Device.IPad)
    expect(result).toHaveLength(0)
  })
})

describe('SkillConstraintFunction', () => {
  const student = makeStudent({
    skills: [{ id: 'skill-swift', proficiency: SkillProficiency.Advanced }],
  })
  const fn = new SkillConstraintFunction([student], skills)

  it('filters students with at least intermediate Swift', () => {
    const result = fn.filterStudentsByConstraintFunction(
      'skill-swift',
      Operator.GREATER_THAN_OR_EQUAL,
      SkillProficiency.Intermediate,
    )
    expect(result).toHaveLength(1)
  })

  it('returns empty when skill not met', () => {
    const result = fn.filterStudentsByConstraintFunction(
      'skill-swift',
      Operator.EQUALS,
      SkillProficiency.Expert,
    )
    expect(result).toHaveLength(0)
  })
})
