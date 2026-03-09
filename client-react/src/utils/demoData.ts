import {
  Student,
  Project,
  Skill,
  Gender,
  Device,
  LanguageProficiency,
  SkillProficiency,
  Language,
  StudentSkill,
  ProjectPreference,
} from '../types'

// ─── Random Helpers ─────────────────────────────────────────────────────────

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomElements<T>(arr: readonly T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── Sample Data Pools ──────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia',
  'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Luna', 'Sebastian',
  'Ella', 'Jack', 'Aria', 'Aiden', 'Chloe', 'Owen', 'Penelope', 'Samuel',
  'Layla', 'Ryan', 'Riley', 'Nathan', 'Zoey', 'Leo', 'Nora', 'Daniel',
  'Lily', 'Matthew', 'Eleanor', 'David', 'Hannah', 'Joseph', 'Lillian',
  'Carter', 'Addison', 'Luke', 'Aubrey', 'Gabriel',
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts',
]

const NATIONALITIES = [
  'German', 'American', 'British', 'French', 'Italian', 'Spanish',
  'Polish', 'Dutch', 'Austrian', 'Swiss', 'Swedish', 'Danish',
  'Norwegian', 'Belgian', 'Irish', 'Portuguese', 'Greek', 'Czech',
  'Hungarian', 'Romanian', 'Indian', 'Chinese', 'Japanese', 'Korean',
  'Brazilian', 'Mexican', 'Canadian', 'Australian',
]

const STUDY_PROGRAMS = [
  'Computer Science', 'Software Engineering', 'Information Systems',
  'Data Science', 'Cybersecurity', 'AI & Machine Learning',
  'Business Informatics', 'Digital Media', 'Games Engineering',
]

const STUDY_DEGREES = ['Bachelor', 'Master']

const LANGUAGES = ['English', 'German', 'French', 'Spanish', 'Chinese', 'Japanese']

const PROJECT_NAMES = [
  'Campus Connect',
  'Smart Library',
  'Student Wellness',
  'Lecture Feedback',
  'Lab Equipment Manager',
]

const SKILL_DEFINITIONS: Array<{ id: string; title: string; description: string }> = [
  { id: 'skill-java', title: 'Java', description: 'Java programming language' },
  { id: 'skill-python', title: 'Python', description: 'Python programming language' },
  { id: 'skill-typescript', title: 'TypeScript', description: 'TypeScript/JavaScript development' },
  { id: 'skill-swift', title: 'Swift', description: 'Swift & iOS development' },
  { id: 'skill-react', title: 'React', description: 'React frontend framework' },
  { id: 'skill-angular', title: 'Angular', description: 'Angular frontend framework' },
  { id: 'skill-databases', title: 'Databases', description: 'SQL and NoSQL databases' },
  { id: 'skill-devops', title: 'DevOps', description: 'CI/CD and deployment' },
  { id: 'skill-ux', title: 'UX Design', description: 'User experience design' },
  { id: 'skill-ml', title: 'Machine Learning', description: 'ML and data analysis' },
]

// ─── Generator Functions ────────────────────────────────────────────────────

function generateStudent(index: number, projectIds: string[], skillIds: string[]): Student {
  const firstName = randomElement(FIRST_NAMES)
  const lastName = randomElement(LAST_NAMES)
  const id = `demo-student-${index.toString().padStart(3, '0')}`

  // Generate 1-3 language proficiencies
  const languageCount = randomInt(1, 3)
  const studentLanguages: Language[] = randomElements(LANGUAGES, 1, languageCount).map(lang => ({
    language: lang,
    proficiency: randomElement(Object.values(LanguageProficiency)),
  }))

  // Generate 2-5 skills
  const studentSkills: StudentSkill[] = randomElements(skillIds, 2, 5).map(skillId => ({
    id: skillId,
    proficiency: randomElement(Object.values(SkillProficiency)),
  }))

  // Generate project preferences (random subset, ranked)
  const prefCount = randomInt(2, Math.min(5, projectIds.length))
  const preferredProjects = randomElements(projectIds, prefCount, prefCount)
  const projectPreferences: ProjectPreference[] = preferredProjects.map((projectId, priority) => ({
    projectId,
    priority,
  }))

  return {
    id,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.edu`,
    gender: randomElement(Object.values(Gender)),
    nationality: randomElement(NATIONALITIES),
    studyProgram: randomElement(STUDY_PROGRAMS),
    studyDegree: randomElement(STUDY_DEGREES),
    semester: randomInt(1, 10),
    devices: randomElements(Object.values(Device), 1, 3) as Device[],
    languages: studentLanguages,
    introSelfAssessment: randomElement(Object.values(SkillProficiency)),
    introCourseProficiency: randomElement(Object.values(SkillProficiency)),
    skills: studentSkills,
    projectPreferences,
    studentComments: [],
    tutorComments: [],
  }
}

function generateProject(index: number): Project {
  const name = PROJECT_NAMES[index] || `Demo Project ${index + 1}`
  return {
    id: `demo-project-${index + 1}`,
    name,
    minSize: 8,
    maxSize: 12,
  }
}

function generateSkills(): Skill[] {
  return SKILL_DEFINITIONS.map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
  }))
}

// ─── Main Export ────────────────────────────────────────────────────────────

export interface DemoData {
  students: Student[]
  projects: Project[]
  skills: Skill[]
}

export function generateDemoData(
  projectCount: number = 5,
  studentCount: number = 50,
): DemoData {
  const projects = Array.from({ length: projectCount }, (_, i) => generateProject(i))
  const skills = generateSkills()
  const projectIds = projects.map(p => p.id)
  const skillIds = skills.map(s => s.id)
  
  const students = Array.from({ length: studentCount }, (_, i) =>
    generateStudent(i + 1, projectIds, skillIds),
  )

  return { students, projects, skills }
}

// ─── Feature Flag ───────────────────────────────────────────────────────────

export function isDemoModeEnabled(): boolean {
  // Check environment variable
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return true
  }
  
  // Check URL query parameter
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    return params.get('demo') === 'true'
  }
  
  return false
}
