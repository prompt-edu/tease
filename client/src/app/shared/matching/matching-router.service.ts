import { Injectable } from '@angular/core';
import { Allocation, CourseIteration, Project, Student } from 'src/app/api/models';
import { StudentIdToProjectIdMapping } from '../data/locked-students.service';
import { CompanyGreedyProject, CompanyGreedyStudent } from './company-greedy/company-greedy.models';
import { CompanyGreedyMatchingService } from './company-greedy/company-greedy-matching.service';
import { ConstraintWrapper } from './constraints/constraint';
import { ConstraintBuilderService } from './constraints/constraint-builder/constraint-builder.service';
import { MatchingService } from './matching.service';

export type MatchingMode = 'ranked-project-preferences' | 'company-greedy';

type CourseIterationWithMatchingMode = CourseIteration & {
  matchingMode?: MatchingMode | 'RANKED_PROJECT_PREFERENCES' | 'COMPANY_GREEDY';
};

export interface MatchingRouterInput {
  students: Student[];
  projects: Project[];
  constraintWrappers: ConstraintWrapper[];
  locks: StudentIdToProjectIdMapping;
  courseIteration?: CourseIterationWithMatchingMode;
}

@Injectable({
  providedIn: 'root',
})
export class MatchingRouterService {
  constructor(
    private constraintBuilderService: ConstraintBuilderService,
    private matchingService: MatchingService,
    private companyGreedyMatchingService: CompanyGreedyMatchingService
  ) {}

  async getAllocations(input: MatchingRouterInput): Promise<Allocation[]> {
    if (this.getMatchingMode(input) === 'company-greedy') {
      return this.companyGreedyMatchingService.getAllocations({
        students: input.students as CompanyGreedyStudent[],
        projects: input.projects as CompanyGreedyProject[],
        constraintWrappers: input.constraintWrappers,
        locks: input.locks,
        activeSemester: input.courseIteration?.semesterName,
      });
    }

    const activeConstraintWrappers = input.constraintWrappers.filter(constraintWrapper => constraintWrapper.isActive);
    const constraints = this.constraintBuilderService.createConstraints(
      input.students,
      input.projects.map(project => project.id),
      activeConstraintWrappers,
      input.locks
    );

    return this.matchingService.getAllocations(constraints);
  }

  getMatchingMode(input: MatchingRouterInput): MatchingMode {
    const explicitMatchingMode = this.normalizeMatchingMode(input.courseIteration?.matchingMode);
    if (explicitMatchingMode) {
      return explicitMatchingMode;
    }

    if (this.hasCompanyGreedyData(input.students, input.projects)) {
      return 'company-greedy';
    }

    return 'ranked-project-preferences';
  }

  private normalizeMatchingMode(matchingMode?: CourseIterationWithMatchingMode['matchingMode']): MatchingMode | null {
    if (matchingMode === 'company-greedy' || matchingMode === 'COMPANY_GREEDY') {
      return 'company-greedy';
    }
    if (matchingMode === 'ranked-project-preferences' || matchingMode === 'RANKED_PROJECT_PREFERENCES') {
      return 'ranked-project-preferences';
    }
    return null;
  }

  private hasCompanyGreedyData(students: Student[], projects: Project[]): boolean {
    const hasStudentTypePreferences = students.some(
      student => !!(student as CompanyGreedyStudent).preferredProjectTypes?.length
    );
    const hasProjectTypeData = projects.some(project => {
      const companyGreedyProject = project as CompanyGreedyProject;
      return !!companyGreedyProject.projectType || !!companyGreedyProject.preferredStudyPrograms?.length;
    });

    return hasStudentTypePreferences && hasProjectTypeData;
  }
}
