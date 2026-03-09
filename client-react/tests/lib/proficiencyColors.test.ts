import { describe, it, expect } from 'vitest'
import { getProficiencyDots } from '../../src/lib/proficiencyColors'
import { SkillProficiency } from '../../src/types'

describe('getProficiencyDots', () => {
  it('Novice: 1 colored + 3 gray', () => {
    const dots = getProficiencyDots(SkillProficiency.Novice)
    expect(dots).toHaveLength(4)
    expect(dots[0]).toBe('#e16868')
    expect(dots[1]).toBe('#d7dadd')
    expect(dots[2]).toBe('#d7dadd')
    expect(dots[3]).toBe('#d7dadd')
  })

  it('Intermediate: 2 colored + 2 gray', () => {
    const dots = getProficiencyDots(SkillProficiency.Intermediate)
    expect(dots[0]).toBe('#eed373')
    expect(dots[1]).toBe('#eed373')
    expect(dots[2]).toBe('#d7dadd')
    expect(dots[3]).toBe('#d7dadd')
  })

  it('Advanced: 3 colored + 1 gray', () => {
    const dots = getProficiencyDots(SkillProficiency.Advanced)
    expect(dots[0]).toBe('#94da7c')
    expect(dots[1]).toBe('#94da7c')
    expect(dots[2]).toBe('#94da7c')
    expect(dots[3]).toBe('#d7dadd')
  })

  it('Expert: 4 colored', () => {
    const dots = getProficiencyDots(SkillProficiency.Expert)
    dots.forEach(d => expect(d).toBe('#4e8cb9'))
  })

  it('always returns exactly 4 entries', () => {
    Object.values(SkillProficiency).forEach(p => {
      expect(getProficiencyDots(p)).toHaveLength(4)
    })
  })
})
