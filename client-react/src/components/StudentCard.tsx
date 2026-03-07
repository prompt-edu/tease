import { useDraggable } from '@dnd-kit/core'
import { Lock, Unlock } from 'lucide-react'
import { Student } from '../types'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'

interface StudentCardProps {
  student: Student
  isLocked: boolean
  onLock: (studentId: string) => void
  onUnlock: (studentId: string) => void
  onClick?: (student: Student) => void
}

export function StudentCard({ student, isLocked, onLock, onUnlock, onClick }: StudentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.id,
    disabled: isLocked,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-background p-2 text-sm shadow-sm cursor-grab',
        isDragging && 'opacity-50 shadow-lg z-50',
        isLocked && 'cursor-not-allowed border-yellow-400 bg-yellow-50',
      )}
      onClick={() => onClick?.(student)}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {student.firstName} {student.lastName}
        </div>
        <div className="text-xs text-muted-foreground truncate">{student.studyProgram}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {student.skills.slice(0, 2).map(sk => (
          <Badge key={sk.id} variant="secondary" className="text-xs py-0">
            {sk.proficiency[0]}
          </Badge>
        ))}
        <button
          className="p-1 rounded hover:bg-muted"
          onClick={e => {
            e.stopPropagation()
            isLocked ? onUnlock(student.id) : onLock(student.id)
          }}
        >
          {isLocked ? (
            <Lock className="h-3 w-3 text-yellow-600" />
          ) : (
            <Unlock className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  )
}
