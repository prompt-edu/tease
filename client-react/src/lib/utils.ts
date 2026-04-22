import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const GLOBALS = {
  LS_KEY_JWT: 'jwt_token',
  LS_KEY_MAPPING: 'id_mapping',
  LS_KEY_ALLOCATIONS: 'allocations',
  LS_KEY_CONSTRAINTS: 'constraints',
  LS_KEY_LOCKS: 'locked_students',
  LS_KEY_COURSE_ITERATION: 'course_iteration_id',
} as const

export const LanguageLevels: Record<string, number> = {
  'A1/A2': 1,
  'B1/B2': 2,
  'C1/C2': 3,
  Native: 4,
}

export const SkillLevels: Record<string, number> = {
  Novice: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
}

export const OperatorMapping: Record<string, string> = {
  '==': 'is equal to',
  '>=': 'at least',
  '<=': 'at most',
  '!=': 'not equals',
}
