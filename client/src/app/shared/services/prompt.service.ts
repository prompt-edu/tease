import { Injectable } from '@angular/core';
import { ApiService } from '../../api/api.service';
import { ApiFnRequired } from '../../api/api.service';
import { teaseCoursePhaseCourseIterationIdProjectsGet as getProjects } from '../../api/fn/projects/tease-course-phase-course-iteration-id-projects-get';
import { teaseCoursePhaseCourseIterationIdSkillsGet as getSkills } from '../../api/fn/skills/tease-course-phase-course-iteration-id-skills-get';
import { teaseCoursePhaseCourseIterationIdStudentsGet as getStudents } from '../../api/fn/students/tease-course-phase-course-iteration-id-students-get';
import { teaseCoursePhaseCourseIterationIdAllocationsGet as getAllocations } from '../../api/fn/allocations/tease-course-phase-course-iteration-id-allocations-get';
import { teaseCoursePhaseCourseIterationIdAllocationsPost as postAllocations } from 'src/app/api/fn/allocations/tease-course-phase-course-iteration-id-allocations-post';
import { teaseCoursePhasesGet as getCourseIterations } from 'src/app/api/fn/course-iterations/tease-course-phases-get';
import { Observable, lastValueFrom } from 'rxjs';
import { Skill, Student, Project, Allocation, CourseIteration } from 'src/app/api/models';
import { StrictHttpResponse } from 'src/app/api/strict-http-response';
import { GLOBALS } from '../utils/constants';

@Injectable({
  providedIn: 'root',
})
export class PromptService {
  constructor(private apiService: ApiService) {}

  private async fetchValue<P, R>(fn: ApiFnRequired<P, R>, courseIterationId?: string): Promise<R> {
    const param: P = { courseIterationId: courseIterationId } as P;
    const values$ = this.apiService.invoke(fn, param);
    return lastValueFrom(values$);
  }

  async getProjects(courseIterationId: string): Promise<Project[]> {
    return this.fetchValue(getProjects, courseIterationId);
  }

  async getSkills(courseIterationId: string): Promise<Skill[]> {
    return this.fetchValue(getSkills, courseIterationId);
  }

  async getStudents(courseIterationId: string): Promise<Student[]> {
    return this.fetchValue(getStudents, courseIterationId);
  }

  async getAllocations(courseIterationId: string): Promise<Allocation[]> {
    return this.fetchValue(getAllocations, courseIterationId);
  }

  async postAllocations(allocations: Allocation[], courseIterationId: string): Promise<boolean> {
    const params = {
      courseIterationId: courseIterationId,
      body: allocations,
    };
    const result: Observable<StrictHttpResponse<void>> = this.apiService.invoke$Response(postAllocations, params);
    return (await lastValueFrom(result)).ok;
  }

  async getCourseIterations(): Promise<CourseIteration[]> {
    return this.fetchValue(getCourseIterations);
  }

  isImportPossible(): boolean {
    return localStorage.getItem(GLOBALS.LS_KEY_JWT) !== null;
  }
}
