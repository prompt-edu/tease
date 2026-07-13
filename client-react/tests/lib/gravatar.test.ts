import { describe, it, expect } from 'vitest'
import { gravatarUrl, useGravatar } from '../../src/lib/gravatar'

describe('gravatarUrl', () => {
  it('returns a gravatar URL with identicon fallback', () => {
    const url = gravatarUrl('test@example.com')
    expect(url).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}\?s=80&d=identicon$/)
  })

  it('normalises email (trim + lowercase) before hashing', () => {
    const url1 = gravatarUrl('Test@Example.COM')
    const url2 = gravatarUrl('  test@example.com  ')
    const url3 = gravatarUrl('test@example.com')
    expect(url1).toBe(url3)
    expect(url2).toBe(url3)
  })

  it('different emails produce different hashes', () => {
    expect(gravatarUrl('alice@example.com')).not.toBe(gravatarUrl('bob@example.com'))
  })

  it('useGravatar returns same result as gravatarUrl', () => {
    expect(useGravatar('alice@example.com')).toBe(gravatarUrl('alice@example.com'))
  })

  it('known MD5: test@example.com → 55502f40dc8b7c769880b10874abc9d0', () => {
    // Verified against external MD5 tool
    const url = gravatarUrl('test@example.com')
    expect(url).toContain('55502f40dc8b7c769880b10874abc9d0')
  })
})
