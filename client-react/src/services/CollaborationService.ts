import { createConnectTransport } from '@connectrpc/connect-web'
import { createPromiseClient } from '@connectrpc/connect'
import { TeamAllocationService } from '../gen/tease/v1/tease_connect'
import { ClientUpdate, ServerUpdate } from '../gen/tease/v1/tease_pb'
import { useAllocationStore } from '../store/useAllocationStore'
import { useConstraintStore } from '../store/useConstraintStore'
import { ConstraintWrapper } from '../types'
import toast from 'react-hot-toast'

type OnConflict = (
  serverVersion: bigint,
  onUseServer: () => void,
  onUseLocal: () => void,
) => void

/**
 * A simple async-iterable queue that lets us push messages into a running
 * async generator (for the bidi stream request side).
 */
class MessageQueue<T> {
  private queue: T[] = []
  private resolve: (() => void) | null = null
  private closed = false

  push(msg: T) {
    this.queue.push(msg)
    this.resolve?.()
    this.resolve = null
  }

  close() {
    this.closed = true
    this.resolve?.()
    this.resolve = null
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    while (!this.closed || this.queue.length > 0) {
      while (this.queue.length > 0) {
        yield this.queue.shift()!
      }
      if (!this.closed) {
        await new Promise<void>(r => { this.resolve = r })
      }
    }
  }
}

class CollaborationService {
  private transport = createConnectTransport({
    baseUrl: window.location.origin,
  })
  private client = createPromiseClient(TeamAllocationService, this.transport)
  private outgoing: MessageQueue<ClientUpdate> | null = null
  private abortController: AbortController | null = null

  async connect(courseIterationId: string, onConflict: OnConflict): Promise<void> {
    this.disconnect()
    this.abortController = new AbortController()

    try {
      const state = await this.client.getInitialState({ courseIterationId })
      const allocationStore = useAllocationStore.getState()
      const serverVersion = state.version

      if (serverVersion > 0n && BigInt(allocationStore.version) !== serverVersion) {
        await new Promise<void>(resolve => {
          onConflict(
            serverVersion,
            () => { this.applyServerState(state); resolve() },
            () => { resolve() },
          )
        })
      } else if (serverVersion > 0n) {
        this.applyServerState(state)
      }

      if (state.constraintsJson && state.constraintsJson.length > 0) {
        try {
          const wrappers: ConstraintWrapper[] = JSON.parse(
            new TextDecoder().decode(state.constraintsJson),
          )
          useConstraintStore.getState().setConstraints(wrappers)
        } catch { /* ignore */ }
      }

      allocationStore.setVersion(Number(serverVersion))
      allocationStore.setConnected(true)

      await this.openStream(courseIterationId)
      toast.success('Connected to collaboration')
    } catch (err) {
      console.error('Collaboration connect error:', err)
      toast.error('Collaboration failed – check PROMPT login')
      useAllocationStore.getState().setConnected(false)
    }
  }

  private applyServerState(
    state: Awaited<ReturnType<typeof this.client.getInitialState>>,
  ) {
    const allocationStore = useAllocationStore.getState()
    const newAllocations: Record<string, string[]> = {}
    for (const a of state.allocations) {
      if (a.projectId) {
        newAllocations[a.projectId] = [...(newAllocations[a.projectId] || []), a.studentId]
      }
    }
    allocationStore.setAllocations(newAllocations)
    const locks: Record<string, string> = {}
    for (const sid of state.lockedStudentIds) {
      const projectId =
        Object.entries(newAllocations).find(([, sids]) => sids.includes(sid))?.[0] || ''
      locks[sid] = projectId
    }
    allocationStore.setLocks(locks)
    allocationStore.setVersion(Number(state.version))
  }

  private async openStream(courseIterationId: string): Promise<void> {
    if (!this.abortController) return

    this.outgoing = new MessageQueue<ClientUpdate>()
    // Kick off with the course iteration ID.
    this.outgoing.push(
      new ClientUpdate({ courseIterationId })
    )

    const outgoing = this.outgoing
    const signal = this.abortController.signal

    // Run the bidi stream in a background async task.
    ;(async () => {
      try {
        const responses = this.client.streamUpdates(outgoing, { signal })
        for await (const update of responses) {
          this.handleServerUpdate(update)
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error('Stream error:', err)
          useAllocationStore.getState().setConnected(false)
          toast.error('Collaboration disconnected')
        }
      }
    })()
  }

  private handleServerUpdate(update: ServerUpdate) {
    const allocationStore = useAllocationStore.getState()
    const constraintStore = useConstraintStore.getState()

    if (update.update.case === 'allocationUpdated') {
      const { studentId, projectId, newVersion } = update.update.value
      allocationStore.moveStudent(studentId, null, projectId)
      allocationStore.setVersion(Number(newVersion))
    } else if (update.update.case === 'studentLocked') {
      const { studentId } = update.update.value
      const projectId =
        Object.entries(allocationStore.allocations).find(([, sids]) =>
          sids.includes(studentId),
        )?.[0] || ''
      allocationStore.lockStudent(studentId, projectId)
    } else if (update.update.case === 'studentUnlocked') {
      allocationStore.unlockStudent(update.update.value.studentId)
    } else if (update.update.case === 'constraintsUpdated') {
      try {
        const wrappers: ConstraintWrapper[] = JSON.parse(
          new TextDecoder().decode(update.update.value.constraintsJson),
        )
        constraintStore.setConstraints(wrappers)
      } catch { /* ignore */ }
    } else if (update.update.case === 'error') {
      if (update.update.value.code === 'CodeAborted') {
        toast.error('Move rejected: version conflict')
      }
    }
  }

  async sendMove(
    studentId: string,
    fromProjectId: string | null,
    toProjectId: string,
    version: number,
  ): Promise<void> {
    this.outgoing?.push(
      new ClientUpdate({
        update: {
          case: 'moveStudent',
          value: {
            studentId,
            fromProjectId: fromProjectId || '',
            toProjectId,
            expectedVersion: BigInt(version),
          },
        },
      }),
    )
  }

  async sendLock(studentId: string): Promise<void> {
    this.outgoing?.push(
      new ClientUpdate({ update: { case: 'lockStudent', value: { studentId } } }),
    )
  }

  async sendUnlock(studentId: string): Promise<void> {
    this.outgoing?.push(
      new ClientUpdate({ update: { case: 'unlockStudent', value: { studentId } } }),
    )
  }

  async sendConstraints(wrappers: ConstraintWrapper[]): Promise<void> {
    const json = new TextEncoder().encode(JSON.stringify(wrappers))
    this.outgoing?.push(
      new ClientUpdate({
        update: { case: 'updateConstraints', value: { constraintsJson: json } },
      }),
    )
  }

  disconnect(): void {
    this.abortController?.abort()
    this.abortController = null
    this.outgoing?.close()
    this.outgoing = null
    useAllocationStore.getState().setConnected(false)
  }
}

export const collaborationService = new CollaborationService()
