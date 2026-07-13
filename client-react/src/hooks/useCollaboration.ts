import { useCallback, useState } from 'react'
import { collaborationService } from '../services/CollaborationService'
import { useAllocationStore } from '../store/useAllocationStore'

interface ConflictState {
  visible: boolean
  serverVersion: bigint
  onUseServer: () => void
  onUseLocal: () => void
}

export function useCollaboration() {
  const connected = useAllocationStore(s => s.connected)
  const version = useAllocationStore(s => s.version)
  const [conflict, setConflict] = useState<ConflictState>({
    visible: false,
    serverVersion: 0n,
    onUseServer: () => {},
    onUseLocal: () => {},
  })

  const connect = useCallback(async (courseIterationId: string) => {
    await collaborationService.connect(courseIterationId, (serverVersion, onUseServer, onUseLocal) => {
      setConflict({
        visible: true,
        serverVersion,
        onUseServer: () => {
          onUseServer()
          setConflict(c => ({ ...c, visible: false }))
        },
        onUseLocal: () => {
          onUseLocal()
          setConflict(c => ({ ...c, visible: false }))
        },
      })
    })
  }, [])

  const disconnect = useCallback(() => {
    collaborationService.disconnect()
  }, [])

  const sendMove = useCallback(
    (studentId: string, fromProjectId: string | null, toProjectId: string) => {
      collaborationService.sendMove(studentId, fromProjectId, toProjectId, version)
    },
    [version],
  )

  const sendLock = useCallback((studentId: string) => {
    collaborationService.sendLock(studentId)
  }, [])

  const sendUnlock = useCallback((studentId: string) => {
    collaborationService.sendUnlock(studentId)
  }, [])

  return { connected, conflict, connect, disconnect, sendMove, sendLock, sendUnlock }
}
