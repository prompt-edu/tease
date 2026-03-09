import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// allocations: projectId → studentId[]
// locks: studentId → projectId (the project this student is locked to)

interface AllocationState {
  // projectId → studentId[]
  allocations: Record<string, string[]>
  // studentId → projectId
  locks: Record<string, string>
  // Collaboration state
  connected: boolean
  version: number

  moveStudent: (studentId: string, fromProjectId: string | null, toProjectId: string | null) => void
  setAllocations: (allocations: Record<string, string[]>) => void
  lockStudent: (studentId: string, projectId: string) => void
  unlockStudent: (studentId: string) => void
  setLocks: (locks: Record<string, string>) => void
  setConnected: (connected: boolean) => void
  setVersion: (version: number) => void
  resetAllocations: () => void
  reset: () => void
}

export const useAllocationStore = create<AllocationState>()(
  persist(
    (set, get) => ({
      allocations: {},
      locks: {},
      connected: false,
      version: 0,

      moveStudent: (studentId, fromProjectId, toProjectId) => {
        set(state => {
          const allocs = { ...state.allocations }
          // Remove from old project
          if (fromProjectId && allocs[fromProjectId]) {
            allocs[fromProjectId] = allocs[fromProjectId].filter(id => id !== studentId)
          } else {
            // Remove from all projects (in case fromProjectId is unknown)
            for (const pid of Object.keys(allocs)) {
              allocs[pid] = allocs[pid].filter(id => id !== studentId)
            }
          }
          // Add to new project
          if (toProjectId) {
            allocs[toProjectId] = [...(allocs[toProjectId] || []), studentId]
          }
          return { allocations: allocs }
        })
      },

      setAllocations: allocations => set({ allocations }),

      lockStudent: (studentId, projectId) =>
        set(state => ({ locks: { ...state.locks, [studentId]: projectId } })),

      unlockStudent: studentId =>
        set(state => {
          const locks = { ...state.locks }
          delete locks[studentId]
          return { locks }
        }),

      setLocks: locks => set({ locks }),
      setConnected: connected => set({ connected }),
      setVersion: version => set({ version }),
      resetAllocations: () => set({ allocations: {} }),
      reset: () => set({ allocations: {}, locks: {}, connected: false, version: 0 }),
    }),
    { name: 'tease-allocations' },
  ),
)

/** Returns a flat list of all allocated studentIds */
export function getAllocatedStudentIds(allocations: Record<string, string[]>): Set<string> {
  return new Set(Object.values(allocations).flat())
}
