import { SkillProficiency } from '../types'

const INACTIVE = '#d7dadd'

const ACTIVE: Record<SkillProficiency, string> = {
  [SkillProficiency.Novice]: '#e16868',
  [SkillProficiency.Intermediate]: '#eed373',
  [SkillProficiency.Advanced]: '#94da7c',
  [SkillProficiency.Expert]: '#4e8cb9',
}

/** Returns an array of 4 hex colors representing the proficiency dot colors. */
export function getProficiencyDots(proficiency: SkillProficiency): string[] {
  const c = ACTIVE[proficiency] ?? INACTIVE
  switch (proficiency) {
    case SkillProficiency.Novice:
      return [c, INACTIVE, INACTIVE, INACTIVE]
    case SkillProficiency.Intermediate:
      return [c, c, INACTIVE, INACTIVE]
    case SkillProficiency.Advanced:
      return [c, c, c, INACTIVE]
    case SkillProficiency.Expert:
      return [c, c, c, c]
    default:
      return [INACTIVE, INACTIVE, INACTIVE, INACTIVE]
  }
}

export { ACTIVE as PROFICIENCY_ACTIVE_COLORS, INACTIVE as PROFICIENCY_INACTIVE_COLOR }
