import { Monitor, Smartphone, Tablet, Watch } from 'lucide-react'
import { Student, Device, SkillProficiency } from '../types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet'
import { Badge } from './ui/badge'
import { genderEmoji } from '../lib/gender'
import { getNationalityInfo } from '../lib/nationality'
import { gravatarUrl } from '../lib/gravatar'
import { getProficiencyDots } from '../lib/proficiencyColors'
import { useDataStore } from '../store/useDataStore'
import { cn } from '../lib/utils'

interface StudentDetailSheetProps {
  student: Student | null
  onClose: () => void
}

function ProficiencyDots({ proficiency }: { proficiency: SkillProficiency }) {
  const dots = getProficiencyDots(proficiency)
  return (
    <span className="flex gap-0.5 items-center">
      {dots.map((color, i) => (
        <span
          key={i}
          style={{ backgroundColor: color }}
          className="inline-block h-2.5 w-2.5 rounded-full"
        />
      ))}
    </span>
  )
}

const DEVICE_ICONS: Partial<Record<Device, React.ElementType>> = {
  [Device.Mac]: Monitor,
  [Device.IPhone]: Smartphone,
  [Device.IPad]: Tablet,
  [Device.Watch]: Watch,
}

const DEVICE_LABELS: Partial<Record<Device, string>> = {
  [Device.Mac]: 'Mac',
  [Device.IPhone]: 'iPhone',
  [Device.IPad]: 'iPad',
  [Device.Watch]: 'Watch',
}

export function StudentDetailSheet({ student, onClose }: StudentDetailSheetProps) {
  const { projects, skills } = useDataStore()
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]))
  const skillMap = Object.fromEntries(skills.map(s => [s.id, s]))

  if (!student) return null

  const nationalityInfo = getNationalityInfo(student.nationality)
  const avatarUrl = gravatarUrl(student.email)
  const sortedPrefs = [...student.projectPreferences].sort((a, b) => a.priority - b.priority)

  return (
    <Sheet open={!!student} onOpenChange={open => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full max-w-[480px] overflow-y-auto">
        {/* Header */}
        <SheetHeader>
          <div className="flex items-start gap-4 pr-8">
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt={`${student.firstName} ${student.lastName}`}
                className="h-16 w-16 rounded-full border object-cover"
                onError={e => {
                  ;(e.target as HTMLImageElement).src =
                    'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=identicon&s=80'
                }}
              />
              {nationalityInfo?.emoji && (
                <span
                  className="absolute -bottom-1 -right-1 text-lg leading-none bg-background rounded-sm"
                  title={nationalityInfo.name}
                >
                  {nationalityInfo.emoji}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">{genderEmoji(student.gender)}</span>
                {student.firstName} {student.lastName}
              </SheetTitle>
              <div className="mt-1 flex items-center gap-2">
                <ProficiencyDots proficiency={student.introCourseProficiency} />
                <span className="text-xs text-muted-foreground">
                  {student.introCourseProficiency}
                </span>
              </div>
              {nationalityInfo && (
                <p className="text-xs text-muted-foreground mt-0.5">{nationalityInfo.name}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Project Preferences */}
          {sortedPrefs.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Project Preferences
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {sortedPrefs.map(pref => (
                  <div
                    key={pref.projectId}
                    className="flex items-center gap-1 rounded border px-2 py-0.5 text-sm"
                  >
                    <span className="text-xs text-muted-foreground font-bold">
                      #{pref.priority + 1}
                    </span>
                    <span className="truncate max-w-[140px]">
                      {projectMap[pref.projectId] ?? pref.projectId}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Devices */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Devices
            </h3>
            <div className="flex gap-3">
              {(Object.values(Device) as Device[])
                .filter(d => d in DEVICE_ICONS)
                .map(d => {
                  const Icon = DEVICE_ICONS[d]!
                  const owned = student.devices.includes(d)
                  return (
                    <div
                      key={d}
                      className={cn('flex flex-col items-center gap-1', !owned && 'opacity-30')}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs">{DEVICE_LABELS[d]}</span>
                    </div>
                  )
                })}
            </div>
          </section>

          {/* Languages */}
          {student.languages.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Languages
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {student.languages.map(lang => (
                  <Badge key={lang.language} variant="secondary" className="text-xs">
                    {lang.language}: {lang.proficiency}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Info grid */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Information
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Program</dt>
              <dd className="truncate">{student.studyProgram || '—'}</dd>
              <dt className="text-muted-foreground">Degree</dt>
              <dd>{student.studyDegree || '—'}</dd>
              <dt className="text-muted-foreground">Semester</dt>
              <dd>{student.semester}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate">
                <a href={`mailto:${student.email}`} className="text-primary hover:underline">
                  {student.email}
                </a>
              </dd>
              <dt className="text-muted-foreground">Nationality</dt>
              <dd>{nationalityInfo?.name ?? student.nationality ?? '—'}</dd>
              <dt className="text-muted-foreground">Self Assessment</dt>
              <dd>{student.introSelfAssessment}</dd>
            </dl>
          </section>

          {/* Skills */}
          {student.skills.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Skills
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {student.skills.map(sk => {
                  const skillDef = skillMap[sk.id]
                  return (
                    <div
                      key={sk.id}
                      className="rounded border p-2 flex flex-col gap-1"
                    >
                      <span className="text-xs font-medium truncate">
                        {skillDef?.title ?? sk.id}
                      </span>
                      <ProficiencyDots proficiency={sk.proficiency} />
                      <span className="text-xs text-muted-foreground">{sk.proficiency}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Tutor Comments */}
          {student.tutorComments.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tutor Comments
              </h3>
              <div className="space-y-2">
                {student.tutorComments.map((c, i) => (
                  <div key={i} className="rounded border p-3 text-sm">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{c.author}</span>
                      <span>{c.date}</span>
                    </div>
                    <p>{c.text || c.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Student Comments */}
          {student.studentComments.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Student Comments
              </h3>
              <div className="space-y-2">
                {student.studentComments.map((c, i) => (
                  <div key={i} className="rounded border p-3 text-sm">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{c.author}</span>
                      <span>{c.date}</span>
                    </div>
                    <p>{c.text || c.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
