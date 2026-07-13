import { describe, it, expect } from 'vitest'
import { getNationalityInfo } from '../../src/lib/nationality'

describe('getNationalityInfo', () => {
  it('returns null for empty string', () => {
    expect(getNationalityInfo('')).toBeNull()
  })

  it('maps "German" → DE flag emoji', () => {
    const info = getNationalityInfo('German')
    expect(info).not.toBeNull()
    expect(info!.emoji).toContain('\u{1F1E9}') // 🇩 regional indicator D
  })

  it('maps "American" → US flag emoji', () => {
    const info = getNationalityInfo('American')
    expect(info).not.toBeNull()
    expect(info!.emoji).toContain('\u{1F1FA}') // 🇺 regional indicator U
  })

  it('maps ISO alpha-2 "DE" directly', () => {
    const info = getNationalityInfo('DE')
    expect(info).not.toBeNull()
    expect(info!.emoji).toContain('\u{1F1E9}')
  })

  it('returns the nationality string as name when not found in lookup', () => {
    const info = getNationalityInfo('Klingon')
    expect(info).not.toBeNull()
    expect(info!.name).toBe('Klingon')
    expect(info!.emoji).toBe('')
  })

  it('flag emoji is always 2 regional indicators (4 chars)', () => {
    const info = getNationalityInfo('French')
    if (info && info.emoji) {
      // Two regional indicator codepoints = 4 UTF-16 code units
      expect([...info.emoji]).toHaveLength(2)
    }
  })
})
