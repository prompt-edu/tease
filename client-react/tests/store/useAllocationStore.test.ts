import { describe, it, expect, beforeEach } from 'vitest'
import { useAllocationStore, getAllocatedStudentIds } from '../../src/store/useAllocationStore'

describe('useAllocationStore', () => {
  beforeEach(() => {
    useAllocationStore.getState().reset()
  })

  // ── moveStudent ────────────────────────────────────────────────────────────

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

  it('moves to __unallocated__ (null toProjectId) removes from all projects', () => {
    useAllocationStore.getState().moveStudent('s1', null, 'p1')
    useAllocationStore.getState().moveStudent('s1', 'p1', null)
    expect((useAllocationStore.getState().allocations['p1'] ?? [])).not.toContain('s1')
  })

  it('handles unknown fromProjectId by scanning all projects', () => {
    useAllocationStore.getState().setAllocations({ p1: ['s1'], p2: ['s2'] })
    useAllocationStore.getState().moveStudent('s1', null, 'p2')
    expect(useAllocationStore.getState().allocations['p1']).not.toContain('s1')
    expect(useAllocationStore.getState().allocations['p2']).toContain('s1')
  })

  it('multiple students can be in the same project', () => {
    useAllocationStore.getState().moveStudent('s1', null, 'p1')
    useAllocationStore.getState().moveStudent('s2', null, 'p1')
    expect(useAllocationStore.getState().allocations['p1']).toHaveLength(2)
  })

  // ── lockStudent / unlockStudent ─────────────────────────────────────────────

  it('locks a student to a project', () => {
    useAllocationStore.getState().lockStudent('s1', 'p1')
    expect(useAllocationStore.getState().locks['s1']).toBe('p1')
  })

  it('unlocks a student: key is fully removed from locks', () => {
    useAllocationStore.getState().lockStudent('s1', 'p1')
    useAllocationStore.getState().unlockStudent('s1')
    expect('s1' in useAllocationStore.getState().locks).toBe(false)
  })

  it('unlocking a non-locked student is a no-op', () => {
    useAllocationStore.getState().unlockStudent('s99')
    expect(useAllocationStore.getState().locks).toEqual({})
  })

  it('locking an unallocated student with empty projectId stores empty string', () => {
    useAllocationStore.getState().lockStudent('s1', '')
    expect(useAllocationStore.getState().locks['s1']).toBe('')
  })

  it('multiple students can be locked independently', () => {
    useAllocationStore.getState().lockStudent('s1', 'p1')
    useAllocationStore.getState().lockStudent('s2', 'p2')
    expect(useAllocationStore.getState().locks['s1']).toBe('p1')
    expect(useAllocationStore.getState().locks['s2']).toBe('p2')
    useAllocationStore.getState().unlockStudent('s1')
    expect('s1' in useAllocationStore.getState().locks).toBe(false)
    expect(useAllocationStore.getState().locks['s2']).toBe('p2')
  })

  it('setLocks replaces entire locks map', () => {
    useAllocationStore.getState().lockStudent('s1', 'p1')
    useAllocationStore.getState().setLocks({ s2: 'p2' })
    expect('s1' in useAllocationStore.getState().locks).toBe(false)
    expect(useAllocationStore.getState().locks['s2']).toBe('p2')
  })

  // ── getAllocatedStudentIds ──────────────────────────────────────────────────

  it('getAllocatedStudentIds returns correct set', () => {
    useAllocationStore.getState().setAllocations({ p1: ['s1', 's2'], p2: ['s3'] })
    const ids = getAllocatedStudentIds(useAllocationStore.getState().allocations)
    expect(ids.has('s1')).toBe(true)
    expect(ids.has('s3')).toBe(true)
    expect(ids.has('s99')).toBe(false)
  })

  it('getAllocatedStudentIds returns empty set when no allocations', () => {
    const ids = getAllocatedStudentIds({})
    expect(ids.size).toBe(0)
  })

  // ── version ────────────────────────────────────────────────────────────────

  it('sets version', () => {
    useAllocationStore.getState().setVersion(42)
    expect(useAllocationStore.getState().version).toBe(42)
  })

  // ── reset ──────────────────────────────────────────────────────────────────

  it('reset clears allocations, locks, version', () => {
    useAllocationStore.getState().moveStudent('s1', null, 'p1')
    useAllocationStore.getState().lockStudent('s1', 'p1')
    useAllocationStore.getState().setVersion(5)
    useAllocationStore.getState().reset()
    expect(useAllocationStore.getState().allocations).toEqual({})
    expect(useAllocationStore.getState().locks).toEqual({})
    expect(useAllocationStore.getState().version).toBe(0)
  })
})
