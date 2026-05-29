import { useDraggable } from '@dnd-kit/core'
import { GripVertical, Lock, Unlock, Monitor, Smartphone, Tablet, Watch } from 'lucide-react'
import { Student, Device } from '../types'
import { cn } from '../lib/utils'
import { getProficiencyDots } from '../lib/proficiencyColors'
import { gravatarUrl } from '../lib/gravatar'
import { getNationalityInfo } from '../lib/nationality'
import { genderEmoji } from '../lib/gender'
import { useDataStore } from '../store/useDataStore'

interface StudentCardProps {
  student: Student
  isLocked: boolean
  onLock: (studentId: string) => void
  onUnlock: (studentId: string) => void
  onClick?: (student: Student) => void
  /** The project this card belongs to (for preference highlighting) */
  projectId?: string
}

function ProficiencyDots({ proficiency }: { proficiency: Student['introCourseProficiency'] }) {
  const dots = getProficiencyDots(proficiency)
  return (
    <span className="flex gap-0.5 items-center">
      {dots.map((color, i) => (
        <span
          key={i}
          style={{ backgroundColor: color }}
          className="inline-block h-2 w-2 rounded-full"
        />
      ))}
    </span>
  )
}

const DEVICE_ICONS: Record<Device, React.ElementType> = {
  [Device.Mac]: Monitor,
  [Device.IPhone]: Smartphone,
  [Device.IPad]: Tablet,
  [Device.Watch]: Watch,
  [Device.RaspberryPi]: Monitor,
}

export function StudentCard({
  student,
  isLocked,
  onLock,
  onUnlock,
  onClick,
  projectId,
}: StudentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: student.id,
      disabled: isLocked,
    })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const { projects } = useDataStore()
  const projectNameMap = Object.fromEntries(projects.map(p => [p.id, p.name]))

  const nationalityInfo = getNationalityInfo(student.nationality)
  const avatarUrl = gravatarUrl(student.email)

  const deLang = student.languages.find(l => l.language === 'de' || l.language === 'German')

  // Sorted preferences (priority 0 = highest)
  const sortedPrefs = [...student.projectPreferences].sort((a, b) => a.priority - b.priority)
  const first4Prefs = sortedPrefs.slice(0, 4)

  // Find assigned project's preference rank
  const assignedPref = projectId
    ? student.projectPreferences.find(p => p.projectId === projectId)
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'rounded-md border bg-background text-sm shadow-sm select-none',
        isLocked ? 'cursor-not-allowed border-yellow-400 bg-yellow-50' : 'cursor-grab',
        isDragging && 'opacity-50 shadow-lg z-[100]',
      )}
      onClick={() => onClick?.(student)}
    >
      {/* Top row: drag-handle icon + name + proficiency + lock */}
      <div className="flex items-center gap-1 px-1.5 pt-1.5 pb-0">
        {/* Visual drag-handle indicator (no listeners — whole card is draggable) */}
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />

        {/* Name + proficiency */}
        <div className="flex flex-1 items-center gap-1 min-w-0">
          <span className="text-muted-foreground text-xs shrink-0">{genderEmoji(student.gender)}</span>
          <span className="font-medium truncate flex-1">
            {student.firstName} {student.lastName}
          </span>
          <ProficiencyDots proficiency={student.introCourseProficiency} />
        </div>

        {/* Lock — stopPropagation on pointerDown prevents dnd-kit from
            intercepting the gesture; stopPropagation on click prevents
            the card-level onClick (detail sheet) from also firing. */}
        <button
          className="shrink-0 p-1 rounded hover:bg-muted"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation()
            isLocked ? onUnlock(student.id) : onLock(student.id)
          }}
          aria-label={isLocked ? 'Unlock' : 'Lock'}
        >
          {isLocked ? (
            <Lock className="h-3 w-3 text-yellow-600" />
          ) : (
            <Unlock className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Middle row: devices + avatar/nationality */}
      <div className="flex items-start gap-1 px-2 py-1">
        {/* Left: devices + language */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex gap-0.5">
            {Object.values(Device)
              .filter(d => d !== Device.RaspberryPi)
              .map(d => {
                const Icon = DEVICE_ICONS[d]
                const owned = student.devices.includes(d)
                return (
                  <Icon
                    key={d}
                    className={cn('h-3.5 w-3.5', owned ? 'text-foreground' : 'text-muted-foreground/30')}
                  />
                )
              })}
          </div>
          {deLang && (
            <span className="text-xs text-muted-foreground">de: {deLang.proficiency}</span>
          )}
        </div>

        {/* Right: avatar + nationality badge */}
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt={`${student.firstName} ${student.lastName}`}
            className="h-10 w-10 rounded-full border object-cover"
            onError={e => {
              ;(e.target as HTMLImageElement).src = `https://www.gravatar.com/avatar/00000000000000000000000000000000?d=identicon&s=80`
            }}
          />
          {nationalityInfo?.emoji && (
            <span
              className="absolute -bottom-0.5 -right-0.5 text-sm leading-none bg-background rounded-sm"
              title={nationalityInfo.name}
            >
              {nationalityInfo.emoji}
            </span>
          )}
        </div>
      </div>

      {/* Bottom row: preference score + preference tiles */}
      {first4Prefs.length > 0 && (
        <div className="flex items-center gap-1 px-2 pb-1.5 flex-wrap">
          {assignedPref !== undefined && (
            <span className="shrink-0 rounded bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5">
              #{assignedPref.priority + 1}
            </span>
          )}
          {first4Prefs.map(pref => (
            <span
              key={pref.projectId}
              className={cn(
                'truncate max-w-[72px] rounded border text-xs px-1 py-0.5',
                pref.projectId === projectId
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-muted text-muted-foreground',
              )}
              title={`Priority ${pref.priority + 1}: ${projectNameMap[pref.projectId] ?? pref.projectId}`}
            >
              {projectNameMap[pref.projectId] ?? pref.projectId}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
