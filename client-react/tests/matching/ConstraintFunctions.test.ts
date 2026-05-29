import { describe, it, expect } from 'vitest'
import { SkillConstraintFunction } from '../../src/matching/functions/SkillConstraintFunction'
import { GenderConstraintFunction } from '../../src/matching/functions/GenderConstraintFunction'
import { DeviceConstraintFunction } from '../../src/matching/functions/DeviceConstraintFunction'
import { LanguageConstraintFunction } from '../../src/matching/functions/LanguageConstraintFunction'
import { NationalityConstraintFunction } from '../../src/matching/functions/NationalityConstraintFunction'
import { IntroCourseConstraintFunction } from '../../src/matching/functions/IntroCourseConstraintFunction'
import { TeamSizeConstraintFunction } from '../../src/matching/functions/TeamSizeConstraintFunction'
import {
  Student,
  Gender,
  Device,
  Skill,
  SkillProficiency,
  LanguageProficiency,
  Operator,
} from '../../src/types'

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: 'test-id',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@test.com',
    gender: Gender.Female,
    nationality: 'German',
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

const skills: Skill[] = [
  { id: 'skill-swift', title: 'Swift', description: '' },
  { id: 'skill-java', title: 'Java', description: '' },
]

// ─── GenderConstraintFunction ────────────────────────────────────────────────

describe('GenderConstraintFunction', () => {
  const alice = makeStudent({ id: 'alice', gender: Gender.Female })
  const bob = makeStudent({ id: 'bob', gender: Gender.Male })
  const other = makeStudent({ id: 'other', gender: Gender.Other })
  const fn = new GenderConstraintFunction([alice, bob, other], skills)

  it('filters by gender equals female', () => {
    const r = fn.filterStudentsByConstraintFunction('cf-gender', Operator.EQUALS, Gender.Female)
    expect(r.map(s => s.id)).toEqual(['alice'])
  })

  it('filters by gender not equals female', () => {
    const r = fn.filterStudentsByConstraintFunction('cf-gender', Operator.NOT_EQUALS, Gender.Female)
    expect(r.map(s => s.id)).toEqual(['bob', 'other'])
  })

  it('only exposes EQUALS and NOT_EQUALS operators', () => {
    const ops = fn.getOperators().map(o => o.id)
    expect(ops).toContain(Operator.EQUALS)
    expect(ops).toContain(Operator.NOT_EQUALS)
    expect(ops).not.toContain(Operator.GREATER_THAN_OR_EQUAL)
  })

  it('getValues returns all Gender enum values', () => {
    const ids = fn.getValues().map(v => v.id)
    Object.values(Gender).forEach(g => expect(ids).toContain(g))
  })

  it('getDescription formats correctly', () => {
    expect(fn.getDescription('Gender', Operator.EQUALS, Gender.Female)).toContain('Female')
  })
})

// ─── DeviceConstraintFunction ────────────────────────────────────────────────

describe('DeviceConstraintFunction', () => {
  const student = makeStudent({ id: 's1', devices: [Device.IPhone, Device.Mac] })
  const noDevice = makeStudent({ id: 's2', devices: [] })
  const fn = new DeviceConstraintFunction([student, noDevice], skills)

  it('matches student who owns the device', () => {
    expect(fn.filterStudentsByConstraintFunction('cf-device', Operator.EQUALS, Device.IPhone))
      .toHaveLength(1)
  })

  it('returns empty when device not owned by anyone', () => {
    expect(fn.filterStudentsByConstraintFunction('cf-device', Operator.EQUALS, Device.IPad))
      .toHaveLength(0)
  })

  it('matches Mac owner', () => {
    expect(fn.filterStudentsByConstraintFunction('cf-device', Operator.EQUALS, Device.Mac))
      .toHaveLength(1)
  })

  it('only exposes EQUALS operator', () => {
    expect(fn.getOperators().map(o => o.id)).toEqual([Operator.EQUALS])
  })

  it('getValues lists all Device enum values', () => {
    const ids = fn.getValues().map(v => v.id)
    Object.values(Device).forEach(d => expect(ids).toContain(d))
  })
})

// ─── SkillConstraintFunction ─────────────────────────────────────────────────

describe('SkillConstraintFunction', () => {
  const expert = makeStudent({ id: 'expert', skills: [{ id: 'skill-swift', proficiency: SkillProficiency.Expert }] })
  const advanced = makeStudent({ id: 'adv', skills: [{ id: 'skill-swift', proficiency: SkillProficiency.Advanced }] })
  const novice = makeStudent({ id: 'nov', skills: [{ id: 'skill-swift', proficiency: SkillProficiency.Novice }] })
  const noSkill = makeStudent({ id: 'none', skills: [] })
  const fn = new SkillConstraintFunction([expert, advanced, novice, noSkill], skills)

  it('EQUALS expert: only expert matches', () => {
    const r = fn.filterStudentsByConstraintFunction('skill-swift', Operator.EQUALS, SkillProficiency.Expert)
    expect(r.map(s => s.id)).toEqual(['expert'])
  })

  it('GTE intermediate: expert and advanced match', () => {
    const r = fn.filterStudentsByConstraintFunction('skill-swift', Operator.GREATER_THAN_OR_EQUAL, SkillProficiency.Intermediate)
    expect(r.map(s => s.id)).toContain('expert')
    expect(r.map(s => s.id)).toContain('adv')
    expect(r.map(s => s.id)).not.toContain('nov')
  })

  it('LTE novice: only novice matches', () => {
    const r = fn.filterStudentsByConstraintFunction('skill-swift', Operator.LESS_THAN_OR_EQUAL, SkillProficiency.Novice)
    expect(r.map(s => s.id)).toEqual(['nov'])
  })

  it('student without the skill is excluded', () => {
    const r = fn.filterStudentsByConstraintFunction('skill-swift', Operator.GREATER_THAN_OR_EQUAL, SkillProficiency.Novice)
    expect(r.map(s => s.id)).not.toContain('none')
  })

  it('unknown skill returns empty', () => {
    const r = fn.filterStudentsByConstraintFunction('skill-unknown', Operator.EQUALS, SkillProficiency.Expert)
    expect(r).toHaveLength(0)
  })

  it('getProperties values come from skills list', () => {
    const ids = fn.getProperties().values.map(v => v.id)
    expect(ids).toContain('skill-swift')
    expect(ids).toContain('skill-java')
  })
})

// ─── LanguageConstraintFunction ──────────────────────────────────────────────

describe('LanguageConstraintFunction', () => {
  const a1 = makeStudent({ id: 'a1', languages: [{ language: 'de', proficiency: LanguageProficiency.A1A2 }] })
  const b1 = makeStudent({ id: 'b1', languages: [{ language: 'de', proficiency: LanguageProficiency.B1B2 }] })
  const native = makeStudent({ id: 'nat', languages: [{ language: 'de', proficiency: LanguageProficiency.Native }] })
  const noGerman = makeStudent({ id: 'en', languages: [{ language: 'en', proficiency: LanguageProficiency.Native }] })
  const fn = new LanguageConstraintFunction([a1, b1, native, noGerman], skills)

  it('GTE B1/B2: B1/B2 and Native match', () => {
    const r = fn.filterStudentsByConstraintFunction('de', Operator.GREATER_THAN_OR_EQUAL, LanguageProficiency.B1B2)
    expect(r.map(s => s.id)).toContain('b1')
    expect(r.map(s => s.id)).toContain('nat')
    expect(r.map(s => s.id)).not.toContain('a1')
  })

  it('student without German is excluded', () => {
    const r = fn.filterStudentsByConstraintFunction('de', Operator.GREATER_THAN_OR_EQUAL, LanguageProficiency.A1A2)
    expect(r.map(s => s.id)).not.toContain('en')
  })

  it('EQUALS A1/A2: only A1/A2 matches', () => {
    const r = fn.filterStudentsByConstraintFunction('de', Operator.EQUALS, LanguageProficiency.A1A2)
    expect(r.map(s => s.id)).toEqual(['a1'])
  })

  it('property en matches English language', () => {
    const r = fn.filterStudentsByConstraintFunction('en', Operator.EQUALS, LanguageProficiency.Native)
    expect(r.map(s => s.id)).toEqual(['en'])
  })

  it('getProperties has en and de', () => {
    const ids = fn.getProperties().values.map(v => v.id)
    expect(ids).toContain('en')
    expect(ids).toContain('de')
  })
})

// ─── NationalityConstraintFunction ───────────────────────────────────────────

describe('NationalityConstraintFunction', () => {
  const german = makeStudent({ id: 'de', nationality: 'German' })
  const french = makeStudent({ id: 'fr', nationality: 'French' })
  const fn = new NationalityConstraintFunction([german, french], skills)

  it('EQUALS German: only German matches', () => {
    const r = fn.filterStudentsByConstraintFunction('cf-nationality', Operator.EQUALS, 'German')
    expect(r.map(s => s.id)).toEqual(['de'])
  })

  it('NOT_EQUALS German: French matches', () => {
    const r = fn.filterStudentsByConstraintFunction('cf-nationality', Operator.NOT_EQUALS, 'German')
    expect(r.map(s => s.id)).toEqual(['fr'])
  })

  it('getValues lists unique nationalities from students', () => {
    const ids = fn.getValues().map(v => v.id)
    expect(ids).toContain('German')
    expect(ids).toContain('French')
  })

  it('getValues is sorted alphabetically', () => {
    const names = fn.getValues().map(v => v.name)
    expect(names).toEqual([...names].sort())
  })

  it('only exposes EQUALS and NOT_EQUALS operators', () => {
    const ops = fn.getOperators().map(o => o.id)
    expect(ops).toContain(Operator.EQUALS)
    expect(ops).toContain(Operator.NOT_EQUALS)
    expect(ops).not.toContain(Operator.GREATER_THAN_OR_EQUAL)
  })
})

// ─── IntroCourseConstraintFunction ───────────────────────────────────────────

describe('IntroCourseConstraintFunction', () => {
  const novice = makeStudent({ id: 'nov', introCourseProficiency: SkillProficiency.Novice })
  const intermediate = makeStudent({ id: 'int', introCourseProficiency: SkillProficiency.Intermediate })
  const expert = makeStudent({ id: 'exp', introCourseProficiency: SkillProficiency.Expert })
  const fn = new IntroCourseConstraintFunction([novice, intermediate, expert], skills)

  it('GTE intermediate: intermediate and expert match', () => {
    const r = fn.filterStudentsByConstraintFunction('', Operator.GREATER_THAN_OR_EQUAL, SkillProficiency.Intermediate)
    expect(r.map(s => s.id)).toContain('int')
    expect(r.map(s => s.id)).toContain('exp')
    expect(r.map(s => s.id)).not.toContain('nov')
  })

  it('EQUALS expert: only expert matches', () => {
    const r = fn.filterStudentsByConstraintFunction('', Operator.EQUALS, SkillProficiency.Expert)
    expect(r.map(s => s.id)).toEqual(['exp'])
  })

  it('LTE novice: only novice matches', () => {
    const r = fn.filterStudentsByConstraintFunction('', Operator.LESS_THAN_OR_EQUAL, SkillProficiency.Novice)
    expect(r.map(s => s.id)).toEqual(['nov'])
  })

  it('exposes all 4 operators', () => {
    const ops = fn.getOperators().map(o => o.id)
    expect(ops).toHaveLength(4)
  })

  it('getValues lists all SkillProficiency levels', () => {
    const ids = fn.getValues().map(v => v.id)
    Object.values(SkillProficiency).forEach(p => expect(ids).toContain(p))
  })
})

// ─── TeamSizeConstraintFunction ──────────────────────────────────────────────

describe('TeamSizeConstraintFunction', () => {
  const alice = makeStudent({ id: 'alice' })
  const bob = makeStudent({ id: 'bob' })
  const fn = new TeamSizeConstraintFunction([alice, bob], skills)

  it('filterStudentsByConstraintFunction returns ALL students (team size applies to all)', () => {
    // TeamSizeConstraintFunction returns all students regardless of args
    const r = (fn as any).filterStudentsByConstraintFunction()
    expect(r).toHaveLength(2)
  })

  it('getDescription returns "Team Size"', () => {
    expect(fn.getDescription()).toBe('Team Size')
  })

  it('only exposes EQUALS operator', () => {
    expect(fn.getOperators().map(o => o.id)).toEqual([Operator.EQUALS])
  })

  it('getValues returns one entry', () => {
    expect(fn.getValues()).toHaveLength(1)
  })

  it('getProperties has team-size entry', () => {
    expect(fn.getProperties().values).toHaveLength(1)
  })
})
