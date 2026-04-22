// TypeScript interfaces matching PROMPT OpenAPI spec

export enum Device {
  IPhone = 'IPhone',
  IPad = 'IPad',
  Mac = 'Mac',
  Watch = 'Watch',
  RaspberryPi = 'Raspberry Pi',
}

export enum Gender {
  Female = 'Female',
  Male = 'Male',
  Other = 'Other',
  PreferNotToSay = 'Prefer not to say',
}

export enum LanguageProficiency {
  A1A2 = 'A1/A2',
  B1B2 = 'B1/B2',
  C1C2 = 'C1/C2',
  Native = 'Native',
}

export enum SkillProficiency {
  Novice = 'Novice',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
  Expert = 'Expert',
}

export interface Language {
  language: string
  proficiency: LanguageProficiency
}

export interface StudentSkill {
  id: string
  proficiency: SkillProficiency
}

export interface ProjectPreference {
  projectId: string
  priority: number // 0 = highest
}

export interface Comment {
  author: string
  date: string
  description: string
  text: string
}

export interface Skill {
  id: string
  title: string
  description: string
}

export interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  gender: Gender
  nationality: string
  studyProgram: string
  studyDegree: string
  semester: number
  devices: Device[]
  languages: Language[]
  introSelfAssessment: SkillProficiency
  introCourseProficiency: SkillProficiency
  skills: StudentSkill[]
  projectPreferences: ProjectPreference[]
  studentComments: Comment[]
  tutorComments: Comment[]
}

export interface Project {
  id: string
  name: string
  minSize?: number
  maxSize?: number
}

export interface Allocation {
  projectId: string
  students: string[] // student IDs
}

export interface CourseIteration {
  id?: string
  semesterName?: string
  kickoffSubmissionPeriodEnd?: string
}

// ─── Constraints ──────────────────────────────────────────────────────────────

export enum Operator {
  EQUALS = '==',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
  NOT_EQUALS = '!=',
}

export interface ConstraintFunctionWrapper {
  property: string
  propertyId: string
  operator: Operator
  value: string
  valueId: string
  studentIds: string[]
  description: string
}

export interface ThresholdWrapper {
  lowerBound: number
  upperBound: number
}

export interface ConstraintWrapper {
  id: string
  projectIds: string[]
  constraintFunction: ConstraintFunctionWrapper
  threshold: ThresholdWrapper
  isActive: boolean
}

// ─── LP Solver Types ──────────────────────────────────────────────────────────

export interface AllocationData {
  students: Student[]
  projects: Project[]
  skills: Skill[]
  allocations: Allocation[]
  courseIterationId: string
}

// Locks: studentId → projectId
export type StudentIdToProjectIdMapping = Map<string, string>
