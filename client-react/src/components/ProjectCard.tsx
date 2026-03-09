import { useDroppable } from '@dnd-kit/core'
import { Users } from 'lucide-react'
import { Project, Student } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { StudentCard } from './StudentCard'
import { cn } from '../lib/utils'

interface ProjectCardProps {
  project: Project
  students: Student[]
  locks: Record<string, string>
  onLock: (studentId: string) => void
  onUnlock: (studentId: string) => void
  onStudentClick?: (student: Student) => void
}

export function ProjectCard({
  project,
  students,
  locks,
  onLock,
  onUnlock,
  onStudentClick,
}: ProjectCardProps) {
  const { isOver, setNodeRef } = useDroppable({ id: project.id })

  const count = students.length
  const min = project.minSize ?? 0
  const max = project.maxSize ?? Infinity
  const isFull = count >= max
  const isUnder = count < min

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex flex-col transition-colors',
        isOver && 'ring-2 ring-primary',
        isFull && 'border-orange-400',
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="truncate">{project.name}</CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="h-3 w-3" />
            <span>{count}</span>
            {project.minSize !== undefined && (
              <span className="text-muted-foreground">/ {project.minSize}–{project.maxSize}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {isUnder && (
            <Badge variant="destructive" className="text-xs">Under capacity</Badge>
          )}
          {isFull && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-400">Full</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-col gap-1 min-h-[60px]">
          {students.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              isLocked={!!locks[student.id]}
              onLock={onLock}
              onUnlock={onUnlock}
              onClick={onStudentClick}
              projectId={project.id}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
