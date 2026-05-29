import { describe, it, expect } from 'vitest'
import { genderEmoji } from '../../src/lib/gender'
import { Gender } from '../../src/types'

describe('genderEmoji', () => {
  it('Female → ♀', () => expect(genderEmoji(Gender.Female)).toBe('♀'))
  it('Male → ♂', () => expect(genderEmoji(Gender.Male)).toBe('♂'))
  it('Other → ⚧', () => expect(genderEmoji(Gender.Other)).toBe('⚧'))
  it('PreferNotToSay → ·', () => expect(genderEmoji(Gender.PreferNotToSay)).toBe('·'))
  it('returns a non-empty string for every Gender value', () => {
    Object.values(Gender).forEach(g => {
      expect(genderEmoji(g).length).toBeGreaterThan(0)
    })
  })
})
