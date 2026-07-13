import { Student, Project, Skill, Allocation, CourseIteration } from '../types'
import { GLOBALS } from '../lib/utils'

const BASE_URL = `${window.location.origin}/team-allocation/api`

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const jwt = localStorage.getItem(GLOBALS.LS_KEY_JWT)
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    ...(options?.headers || {}),
  }
  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export class PromptService {
  async getCourseIterations(): Promise<CourseIteration[]> {
    return fetchJson<CourseIteration[]>(`${BASE_URL}/course-phases`)
  }

  async getStudents(courseIterationId: string): Promise<Student[]> {
    return fetchJson<Student[]>(`${BASE_URL}/course-phases/${courseIterationId}/students`)
  }

  async getProjects(courseIterationId: string): Promise<Project[]> {
    return fetchJson<Project[]>(`${BASE_URL}/course-phases/${courseIterationId}/projects`)
  }

  async getSkills(courseIterationId: string): Promise<Skill[]> {
    return fetchJson<Skill[]>(`${BASE_URL}/course-phases/${courseIterationId}/skills`)
  }

  async getAllocations(courseIterationId: string): Promise<Allocation[]> {
    return fetchJson<Allocation[]>(`${BASE_URL}/course-phases/${courseIterationId}/allocations`)
  }

  async postAllocations(allocations: Allocation[], courseIterationId: string): Promise<boolean> {
    const response = await fetch(
      `${BASE_URL}/course-phases/${courseIterationId}/allocations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem(GLOBALS.LS_KEY_JWT) || ''}`,
        },
        body: JSON.stringify(allocations),
      },
    )
    return response.ok
  }

  isImportPossible(): boolean {
    return localStorage.getItem(GLOBALS.LS_KEY_JWT) !== null
  }
}

export const promptService = new PromptService()
