import { describe, it, expect, beforeEach } from 'vitest'
import { useAllocationStore, getAllocatedStudentIds } from '../../src/store/useAllocationStore'

describe('useAllocationStore', () => {
  beforeEach(() => {
    useAllocationStore.getState().reset()
  })

  it('moves a student to a project', () => {
    useAllocationStore.getState().moveStudent('s1', null, 'p1')
    expect(useAllocationStore.getState().allocations['p1']).toContain('s1')
  })

  it('removes student from old project when moving', () => {
    useAllocationStore.getState().moveStudent('s1', null, 'p1')
    useAllocationStore.getState().moveStudent('s1', 'p1', 'p2')
    expect(useAllocationStore.getState().allocations['p1'] ?? []).not.toContain('s1')
    expect(useAllocationStore.getState().allocations['p2']).toContain('s1')
  })

  it('locks and unlocks a student', () => {
    useAllocationStore.getState().lockStudent('s1', 'p1')
    expect(useAllocationStore.getState().locks['s1']).toBe('p1')
    useAllocationStore.getState().unlockStudent('s1')
    expect(useAllocationStore.getState().locks['s1']).toBeUndefined()
  })

  it('getAllocatedStudentIds returns correct set', () => {
    useAllocationStore.getState().setAllocations({ p1: ['s1', 's2'], p2: ['s3'] })
    const ids = getAllocatedStudentIds(useAllocationStore.getState().allocations)
    expect(ids.has('s1')).toBe(true)
    expect(ids.has('s3')).toBe(true)
    expect(ids.has('s99')).toBe(false)
  })

  it('sets version', () => {
    useAllocationStore.getState().setVersion(42)
    expect(useAllocationStore.getState().version).toBe(42)
  })
})
