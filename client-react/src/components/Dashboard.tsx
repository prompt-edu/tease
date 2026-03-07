import { useState } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { Play, Users } from 'lucide-react'
import { useDataStore } from '../store/useDataStore'
import { useAllocationStore, getAllocatedStudentIds } from '../store/useAllocationStore'
import { useConstraintStore } from '../store/useConstraintStore'
import { useCollaboration } from '../hooks/useCollaboration'
import { useDragDrop } from '../hooks/useDragDrop'
import { ProjectCard } from './ProjectCard'
import { StudentCard } from './StudentCard'
import { CollaborationStatus } from './CollaborationStatus'
import { ConflictDialog } from './ConflictDialog'
import { ImportDialog } from './ImportDialog'
import { ExportDialog } from './ExportDialog'
import { ConstraintBuilderDialog } from './ConstraintBuilder/ConstraintBuilderDialog'
import { StatisticsPanel } from './Statistics/StatisticsPanel'
import { Button } from './ui/button'
import { buildConstraints } from '../matching/constraints/ConstraintBuilder'
import { LPSolverStrategy } from '../matching/strategies/LPSolverStrategy'
import { Student, StudentIdToProjectIdMapping } from '../types'
import toast from 'react-hot-toast'

// Droppable zone for unallocated students
function UnallocatedZone() {
  const { isOver, setNodeRef } = useDroppable({ id: '__unallocated__' })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border-2 border-dashed p-2 min-h-[60px] transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'}`}
    />
  )
}

export function Dashboard() {
  const { students, projects, skills, courseIterationId } = useDataStore()
  const { allocations, locks, connected, version } = useAllocationStore()
  const { constraintWrappers } = useConstraintStore()
  const { conflict, connect, disconnect, sendMove, sendLock, sendUnlock } = useCollaboration()
  const [solving, setSolving] = useState(false)
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null)

  const { onDragEnd } = useDragDrop(connected ? sendMove : undefined)

  const allocatedIds = getAllocatedStudentIds(allocations)
  const unallocatedStudents = students.filter(s => !allocatedIds.has(s.id))

  async function handleSolve() {
    setSolving(true)
    try {
      const locksMap: StudentIdToProjectIdMapping = new Map(Object.entries(locks))
      const constraints = buildConstraints(
        students,
        projects.map(p => p.id),
        constraintWrappers,
        locksMap,
      )
      const solver = new LPSolverStrategy()
      const result = await solver.solve(constraints)
      if (!result) {
        toast.error('No feasible solution found')
        return
      }
      const newAllocations: Record<string, string[]> = {}
      for (const a of result) {
        newAllocations[a.projectId] = a.students
      }
      useAllocationStore.getState().setAllocations(newAllocations)
      toast.success(`Allocated ${result.flatMap(a => a.students).length} students`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSolving(false)
    }
  }

  const activeStudent = activeStudentId ? students.find(s => s.id === activeStudentId) : null

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Conflict resolution dialog */}
      <ConflictDialog
        open={conflict.visible}
        serverVersion={conflict.serverVersion}
        onUseServer={conflict.onUseServer}
        onUseLocal={conflict.onUseLocal}
      />

      {/* Header */}
      <header className="flex items-center gap-3 border-b px-4 py-2">
        <h1 className="text-base font-semibold">TEASE</h1>
        <div className="flex-1" />
        <CollaborationStatus connected={connected} />
        {!connected && courseIterationId && (
          <Button size="sm" variant="outline" onClick={() => connect(courseIterationId)}>
            Connect
          </Button>
        )}
        {connected && (
          <Button size="sm" variant="ghost" onClick={disconnect}>
            Disconnect
          </Button>
        )}
        <ImportDialog />
        <ExportDialog />
        <ConstraintBuilderDialog />
        <Button size="sm" disabled={solving || students.length === 0} onClick={handleSolve}>
          <Play className="h-4 w-4 mr-1" />
          {solving ? 'Solving…' : 'Solve'}
        </Button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext
          onDragStart={e => setActiveStudentId(e.active.id as string)}
          onDragEnd={e => {
            setActiveStudentId(null)
            onDragEnd(e)
          }}
          onDragCancel={() => setActiveStudentId(null)}
        >
          {/* Project grid */}
          <div className="flex-1 overflow-auto p-4">
            {projects.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users className="mx-auto h-12 w-12 mb-3 opacity-30" />
                  <p>No data loaded. Use Import to load from PROMPT.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                {projects.map(project => {
                  const projectStudents = (allocations[project.id] || [])
                    .map(sid => students.find(s => s.id === sid))
                    .filter(Boolean) as Student[]
                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      students={projectStudents}
                      locks={locks}
                      onLock={sid => {
                        useAllocationStore.getState().lockStudent(sid, project.id)
                        if (connected) sendLock(sid)
                      }}
                      onUnlock={sid => {
                        useAllocationStore.getState().unlockStudent(sid)
                        if (connected) sendUnlock(sid)
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Unallocated student pool */}
          {students.length > 0 && (
            <div className="w-56 shrink-0 overflow-y-auto border-l p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Unallocated ({unallocatedStudents.length})
              </p>
              <UnallocatedZone />
              <div className="mt-2 flex flex-col gap-1">
                {unallocatedStudents.map(student => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    isLocked={!!locks[student.id]}
                    onLock={sid => {
                      useAllocationStore.getState().lockStudent(sid, '')
                      if (connected) sendLock(sid)
                    }}
                    onUnlock={sid => {
                      useAllocationStore.getState().unlockStudent(sid)
                      if (connected) sendUnlock(sid)
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <DragOverlay>
            {activeStudent && (
              <div className="rounded-md border bg-background p-2 shadow-xl text-sm opacity-90">
                {activeStudent.firstName} {activeStudent.lastName}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Statistics */}
      <StatisticsPanel />
    </div>
  )
}
