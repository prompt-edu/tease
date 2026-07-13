import { useCallback } from 'react'
import { DragEndEvent } from '@dnd-kit/core'
import { useAllocationStore } from '../store/useAllocationStore'

type SendMove = (studentId: string, fromProjectId: string | null, toProjectId: string) => void

/**
 * Returns a dnd-kit compatible onDragEnd handler that applies
 * optimistic local updates and optionally calls the collaboration service.
 */
export function useDragDrop(sendMove?: SendMove) {
  const moveStudent = useAllocationStore(s => s.moveStudent)
  const allocations = useAllocationStore(s => s.allocations)
  const locks = useAllocationStore(s => s.locks)

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const studentId = active.id as string
      const toProjectId = over.id as string

      // Do not move locked students.
      if (locks[studentId]) return
      // Do not move to the same container.
      const fromProjectId =
        Object.entries(allocations).find(([, ids]) => ids.includes(studentId))?.[0] ?? null
      if (fromProjectId === toProjectId) return

      // Optimistic local update.
      moveStudent(studentId, fromProjectId, toProjectId)

      // Send to collaboration server.
      sendMove?.(studentId, fromProjectId, toProjectId)
    },
    [allocations, locks, moveStudent, sendMove],
  )

  return { onDragEnd }
}
