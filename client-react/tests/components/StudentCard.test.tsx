import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { StudentCard } from '../../src/components/StudentCard'
import { Gender, Device, SkillProficiency, Student } from '../../src/types'

// Stub useDataStore so StudentCard doesn't need a full Zustand provider
vi.mock('../../src/store/useDataStore', () => ({
  useDataStore: () => ({
    projects: [
      { id: 'p1', name: 'Alpha Project' },
      { id: 'p2', name: 'Beta Project' },
    ],
  }),
}))

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: 'test-1',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@test.com',
    gender: Gender.Female,
    nationality: 'German',
    studyProgram: 'CS',
    studyDegree: 'Bachelor',
    semester: 3,
    devices: [Device.Mac, Device.IPhone],
    languages: [{ language: 'de', proficiency: 'B1/B2' as any }],
    introSelfAssessment: SkillProficiency.Intermediate,
    introCourseProficiency: SkillProficiency.Advanced,
    skills: [{ id: 'skill-swift', proficiency: SkillProficiency.Expert }],
    projectPreferences: [
      { projectId: 'p1', priority: 0 },
      { projectId: 'p2', priority: 1 },
    ],
    studentComments: [],
    tutorComments: [],
    ...overrides,
  }
}

function renderCard(
  student = makeStudent(),
  props: {
    isLocked?: boolean
    onLock?: ReturnType<typeof vi.fn>
    onUnlock?: ReturnType<typeof vi.fn>
    onClick?: ReturnType<typeof vi.fn>
    projectId?: string
  } = {},
) {
  const onLock = props.onLock ?? vi.fn()
  const onUnlock = props.onUnlock ?? vi.fn()
  const onClick = props.onClick ?? vi.fn()

  render(
    <DndContext>
      <StudentCard
        student={student}
        isLocked={props.isLocked ?? false}
        onLock={onLock}
        onUnlock={onUnlock}
        onClick={onClick}
        projectId={props.projectId}
      />
    </DndContext>,
  )
  return { onLock, onUnlock, onClick }
}

describe('StudentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders student full name', () => {
    renderCard()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('renders gender emoji for female', () => {
    renderCard()
    expect(screen.getByText('♀')).toBeInTheDocument()
  })

  it('renders german language proficiency', () => {
    renderCard()
    expect(screen.getByText(/de:/)).toBeInTheDocument()
  })

  it('renders project preference tiles with project names', () => {
    renderCard()
    expect(screen.getByText('Alpha Project')).toBeInTheDocument()
    expect(screen.getByText('Beta Project')).toBeInTheDocument()
  })

  it('renders assigned project score badge when projectId is provided', () => {
    renderCard(makeStudent(), { projectId: 'p1' })
    // priority 0 = "#1"
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('renders lock icon when unlocked', () => {
    renderCard()
    expect(screen.getByRole('button', { name: /lock/i })).toBeInTheDocument()
  })

  it('renders unlock icon when locked', () => {
    renderCard(makeStudent(), { isLocked: true })
    expect(screen.getByRole('button', { name: /unlock/i })).toBeInTheDocument()
  })

  // ── Lock button interactions ───────────────────────────────────────────────

  it('lock button calls onLock when student is not locked', () => {
    const onLock = vi.fn()
    renderCard(makeStudent(), { isLocked: false, onLock })
    fireEvent.click(screen.getByRole('button', { name: /lock/i }))
    expect(onLock).toHaveBeenCalledWith('test-1')
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('lock button calls onUnlock when student is locked', () => {
    const onUnlock = vi.fn()
    renderCard(makeStudent(), { isLocked: true, onUnlock })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))
    expect(onUnlock).toHaveBeenCalledWith('test-1')
    expect(onUnlock).toHaveBeenCalledTimes(1)
  })

  it('lock button does NOT call onClick (stopPropagation)', () => {
    const onClick = vi.fn()
    const onLock = vi.fn()
    renderCard(makeStudent(), { onClick, onLock })
    fireEvent.click(screen.getByRole('button', { name: /lock/i }))
    expect(onLock).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('unlocking does NOT trigger onClick', () => {
    const onClick = vi.fn()
    const onUnlock = vi.fn()
    renderCard(makeStudent(), { isLocked: true, onClick, onUnlock })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))
    expect(onUnlock).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  // ── Card click → detail sheet ──────────────────────────────────────────────

  it('clicking the card calls onClick with the student', () => {
    const onClick = vi.fn()
    const student = makeStudent()
    renderCard(student, { onClick })
    fireEvent.click(screen.getByText('Alice Smith'))
    expect(onClick).toHaveBeenCalledWith(student)
  })

  it('clicking name region calls onClick', () => {
    const onClick = vi.fn()
    renderCard(makeStudent(), { onClick })
    fireEvent.click(screen.getByText('Alice Smith'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  // ── Locked state ──────────────────────────────────────────────────────────

  it('onLock is not called when isLocked is already true', () => {
    const onLock = vi.fn()
    renderCard(makeStudent(), { isLocked: true, onLock })
    // The button should say Unlock, not Lock
    expect(screen.queryByRole('button', { name: /^lock$/i })).toBeNull()
    expect(onLock).not.toHaveBeenCalled()
  })
})
