import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Student, Project, Skill, CourseIteration } from '../types'

interface DataState {
  students: Student[]
  projects: Project[]
  skills: Skill[]
  courseIterations: CourseIteration[]
  courseIterationId: string | null

  setStudents: (students: Student[]) => void
  setProjects: (projects: Project[]) => void
  setSkills: (skills: Skill[]) => void
  setCourseIterations: (iterations: CourseIteration[]) => void
  setCourseIterationId: (id: string | null) => void
  reset: () => void
}

export const useDataStore = create<DataState>()(
  persist(
    set => ({
      students: [],
      projects: [],
      skills: [],
      courseIterations: [],
      courseIterationId: null,

      setStudents: students => set({ students }),
      setProjects: projects => set({ projects }),
      setSkills: skills => set({ skills }),
      setCourseIterations: courseIterations => set({ courseIterations }),
      setCourseIterationId: courseIterationId => set({ courseIterationId }),
      reset: () =>
        set({ students: [], projects: [], skills: [], courseIterations: [], courseIterationId: null }),
    }),
    { name: 'tease-data' },
  ),
)
