import { describe, it, expect, beforeEach } from 'vitest'
import { IdMappingService } from '../../src/services/IdMappingService'

describe('IdMappingService', () => {
  let service: IdMappingService

  beforeEach(() => {
    localStorage.clear()
    service = new IdMappingService()
  })

  it('assigns sequential numerical IDs to UUIDs', () => {
    const id1 = service.getNumericalId('uuid-a')
    const id2 = service.getNumericalId('uuid-b')
    expect(Number(id1)).toBeGreaterThanOrEqual(1)
    expect(id2).not.toBe(id1)
  })

  it('returns same numerical ID for the same UUID', () => {
    const id1 = service.getNumericalId('uuid-stable')
    const id2 = service.getNumericalId('uuid-stable')
    expect(id1).toBe(id2)
  })

  it('roundtrips UUID → number → UUID', () => {
    const uuid = 'roundtrip-uuid'
    const numId = service.getNumericalId(uuid)
    expect(service.getId(numId)).toBe(uuid)
  })

  it('returns undefined for unknown numerical ID', () => {
    expect(service.getId('9999')).toBeUndefined()
  })

  it('resets the mapping', () => {
    service.getNumericalId('uuid-x')
    service.reset()
    expect(service.getId('1')).toBeUndefined()
  })
})
