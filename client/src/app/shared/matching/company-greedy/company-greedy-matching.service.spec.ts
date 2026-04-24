/* global beforeEach, describe, expect, it */
import { Gender, SkillProficiency } from 'src/app/api/models';
import { CompanyGreedyMatchingInput, CompanyGreedyProject, CompanyGreedyStudent } from './company-greedy.models';
import { CompanyGreedyMatchingService } from './company-greedy-matching.service';
import { ConstraintWrapper } from '../constraints/constraint';
import { Operator } from '../constraints/constraint-utils';

declare const describe: (description: string, specDefinitions: () => void) => void;
declare const beforeEach: (action: () => void) => void;
declare const it: (description: string, assertion: () => void) => void;
declare const expect: <T>(actual: T) => {
  toEqual(expected: unknown): void;
  toContain(expected: unknown): void;
  not: {
    toContain(expected: unknown): void;
  };
};

describe('CompanyGreedyMatchingService', () => {
  let service: CompanyGreedyMatchingService;

  beforeEach(() => {
    service = new CompanyGreedyMatchingService();
  });

  it('initializes one allocation for every project', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [],
        projects: [createProject('project-1'), createProject('project-2')],
      })
    );

    expect(allocations).toEqual([
      { projectId: 'project-1', students: [] },
      { projectId: 'project-2', students: [] },
    ]);
  });

  it('filters out blacklisted students, previous participants, and students outside the active semester', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [
          createStudent('eligible'),
          createStudent('blacklisted', { blacklisted: true }),
          createStudent('previous-participant', { previousParticipation: true }),
          createStudent('wrong-semester', { registeredIn: 'WS25' }),
        ],
        projects: [createProject('project-1', { capacity: 4 })],
      })
    );

    expect(allocations[0].students).toEqual(['eligible']);
  });

  it('applies valid locks before greedy assignment', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [createStudent('locked'), createStudent('unlocked')],
        projects: [createProject('project-1'), createProject('project-2')],
        locks: new Map([['locked', 'project-2']]),
      })
    );

    expect(allocations.find(allocation => allocation.projectId === 'project-2')?.students).toContain('locked');
    expect(allocations.find(allocation => allocation.projectId === 'project-1')?.students).not.toContain('locked');
  });

  it('ignores a locked assignment that violates an active nationality constraint and keeps the student assignable elsewhere', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [createStudent('locked-student', { nationality: 'DE' }), createStudent('other-student')],
        projects: [createProject('restricted-project'), createProject('open-project')],
        constraintWrappers: [createNationalityConstraint('restricted-project', ['locked-student'])],
        locks: new Map([['locked-student', 'restricted-project']]),
      })
    );

    expect(allocations.find(allocation => allocation.projectId === 'restricted-project')?.students).not.toContain(
      'locked-student'
    );
    expect(allocations.find(allocation => allocation.projectId === 'open-project')?.students).toContain(
      'locked-student'
    );
  });

  it('applies only the first lock when multiple locks exceed project capacity', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [createStudent('student-1'), createStudent('student-2')],
        projects: [createProject('project-1', { capacity: 1 }), createProject('project-2', { capacity: 1 })],
        locks: new Map([
          ['student-1', 'project-1'],
          ['student-2', 'project-1'],
        ]),
      })
    );

    expect(allocations.find(allocation => allocation.projectId === 'project-1')?.students).toEqual(['student-1']);
    expect(allocations.find(allocation => allocation.projectId === 'project-1')?.students).not.toContain('student-2');
  });

  it('does not assign the same student twice', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [createStudent('student-1')],
        projects: [createProject('project-1'), createProject('project-2')],
      })
    );

    const assignedStudentIds = allocations.flatMap(allocation => allocation.students);

    expect(assignedStudentIds).toEqual(['student-1']);
  });

  it('respects project capacity', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [createStudent('student-1'), createStudent('student-2')],
        projects: [createProject('project-1', { capacity: 1 })],
      })
    );

    expect(allocations[0].students.length).toEqual(1);
  });

  it('respects study program requirements and active nationality UI constraints', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [
          createStudent('restricted-nationality', { nationality: 'DE' }),
          createStudent('wrong-study-program', { studyProgram: 'Management' }),
          createStudent('eligible', { nationality: 'IN' }),
        ],
        projects: [
          createProject('project-1', {
            capacity: 3,
            preferredStudyPrograms: ['Informatics'],
          }),
        ],
        constraintWrappers: [createNationalityConstraint('project-1', ['restricted-nationality'])],
      })
    );

    expect(allocations[0].students).toEqual(['eligible']);
  });

  it('prefers a perfect match over a qualified match', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [
          createStudent('qualified', { preferredProjectTypes: ['Finance'], registeredBefore: true }),
          createStudent('perfect', { preferredProjectTypes: ['IT'], registeredBefore: true }),
        ],
        projects: [createProject('project-1', { capacity: 1, projectType: 'IT' })],
      })
    );

    expect(allocations[0].students).toEqual(['perfect']);
  });

  it('treats project-type interest as qualified when registeredBefore is false', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [
          createStudent('type-match', { preferredProjectTypes: ['IT'], registeredBefore: false }),
          createStudent('registered-before', { preferredProjectTypes: ['Finance'], registeredBefore: true }),
        ],
        projects: [createProject('project-1', { capacity: 1, projectType: 'IT' })],
      })
    );

    expect(allocations[0].students).toEqual(['type-match']);
  });

  it('performs a fair first round before filling remaining capacity', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [createStudent('student-1'), createStudent('student-2'), createStudent('student-3')],
        projects: [createProject('project-1', { capacity: 2 }), createProject('project-2', { capacity: 2 })],
      })
    );

    expect(allocations.find(allocation => allocation.projectId === 'project-1')?.students.length).toEqual(2);
    expect(allocations.find(allocation => allocation.projectId === 'project-2')?.students.length).toEqual(1);
  });

  it('returns an empty allocation list when no projects are provided', () => {
    const allocations = service.getAllocations(
      createInput({
        students: [createStudent('student-1')],
        projects: [],
      })
    );

    expect(allocations).toEqual([]);
  });
});

function createInput(input: Partial<CompanyGreedyMatchingInput>): CompanyGreedyMatchingInput {
  return {
    students: input.students ?? [],
    projects: input.projects ?? [],
    constraintWrappers: input.constraintWrappers ?? [],
    locks: input.locks ?? new Map(),
    activeSemester: input.activeSemester ?? 'SS25',
  };
}

function createStudent(id: string, overrides: Partial<CompanyGreedyStudent> = {}): CompanyGreedyStudent {
  return {
    devices: [],
    email: `${id}@example.com`,
    firstName: id,
    gender: Gender.PreferNotToSay,
    id,
    introCourseProficiency: SkillProficiency.Novice,
    introSelfAssessment: SkillProficiency.Novice,
    languages: [],
    lastName: 'Student',
    nationality: 'IN',
    projectPreferences: [],
    semester: 1,
    skills: [],
    studentComments: [],
    studyDegree: 'Master',
    studyProgram: 'Informatics',
    tutorComments: [],
    preferredProjectTypes: ['IT'],
    registeredBefore: false,
    previousParticipation: false,
    blacklisted: false,
    registeredIn: 'SS25',
    ...overrides,
  };
}

function createProject(id: string, overrides: Partial<CompanyGreedyProject> = {}): CompanyGreedyProject {
  return {
    id,
    name: id,
    projectType: 'IT',
    preferredStudyPrograms: ['Informatics'],
    capacity: 1,
    ...overrides,
  };
}

function createNationalityConstraint(projectId: string, studentIds: string[]): ConstraintWrapper {
  return {
    projectIds: [projectId],
    constraintFunction: {
      property: 'Nationality',
      propertyId: 'cf-nationality',
      operator: Operator.EQUALS,
      value: 'Germany',
      valueId: 'DE',
      studentIds,
      description: 'Nationality is equal to Germany',
    },
    threshold: {
      lowerBound: 0,
      upperBound: 0,
    },
    id: 'nationality-constraint',
    isActive: true,
  };
}
