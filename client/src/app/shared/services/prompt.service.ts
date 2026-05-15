import { Injectable } from '@angular/core';
import { ApiService, ApiFnRequired } from '../../api/api.service';
import { teaseCoursePhaseCourseIterationIdProjectsGet as getProjects } from '../../api/fn/projects/tease-course-phase-course-iteration-id-projects-get';
import { teaseCoursePhaseCourseIterationIdSkillsGet as getSkills } from '../../api/fn/skills/tease-course-phase-course-iteration-id-skills-get';
import { teaseCoursePhaseCourseIterationIdStudentsGet as getStudents } from '../../api/fn/students/tease-course-phase-course-iteration-id-students-get';
import { teaseCoursePhaseCourseIterationIdAllocationsGet as getAllocations } from '../../api/fn/allocations/tease-course-phase-course-iteration-id-allocations-get';
import { teaseCoursePhasesGet as getCourseIterations } from 'src/app/api/fn/course-iterations/tease-course-phases-get';
import { teaseCoursePhaseCoursePhaseIdWorkspaceGet as getWorkspace } from 'src/app/api/fn/workspace/tease-course-phase-course-phase-id-workspace-get';
import { teaseCoursePhaseCoursePhaseIdWorkspacePut as putWorkspace } from 'src/app/api/fn/workspace/tease-course-phase-course-phase-id-workspace-put';
import { teaseCoursePhaseCoursePhaseIdSavePost as postSave } from 'src/app/api/fn/workspace/tease-course-phase-course-phase-id-save-post';
import { lastValueFrom } from 'rxjs';
import { Skill, Student, Project, Allocation, CourseIteration } from 'src/app/api/models';
import { TeaseSaveRequest, TeaseWorkspace, TeaseWorkspaceUpsert } from 'src/app/api/models/tease-workspace';
import { GLOBALS } from '../utils/constants';

@Injectable({
  providedIn: 'root',
})
export class PromptService {
  constructor(private apiService: ApiService) {}

  private fetchValue<P, R>(fn: ApiFnRequired<P, R>, courseIterationId?: string): Promise<R> {
    return lastValueFrom(this.apiService.invoke(fn, { courseIterationId } as P));
  }

  getProjects(courseIterationId: string): Promise<Project[]> {
    return this.fetchValue(getProjects, courseIterationId);
  }

  getSkills(courseIterationId: string): Promise<Skill[]> {
    return this.fetchValue(getSkills, courseIterationId);
  }

  getStudents(courseIterationId: string): Promise<Student[]> {
    return this.fetchValue(getStudents, courseIterationId);
  }

  getAllocations(courseIterationId: string): Promise<Allocation[]> {
    return this.fetchValue(getAllocations, courseIterationId);
  }

  getCourseIterations(): Promise<CourseIteration[]> {
    return this.fetchValue(getCourseIterations);
  }

  /** Returns the persisted workspace for this course phase (empty default if none). */
  getWorkspace(coursePhaseId: string): Promise<TeaseWorkspace> {
    return lastValueFrom(this.apiService.invoke(getWorkspace, { coursePhaseId }));
  }

  /** Upsert workspace draft. Does NOT touch the allocations table. */
  putWorkspace(coursePhaseId: string, workspace: TeaseWorkspaceUpsert): Promise<TeaseWorkspace> {
    return lastValueFrom(this.apiService.invoke(putWorkspace, { coursePhaseId, body: workspace }));
  }

  /** Atomic publish: workspace + allocations in one server-side transaction. */
  postSave(coursePhaseId: string, payload: TeaseSaveRequest): Promise<TeaseWorkspace> {
    return lastValueFrom(this.apiService.invoke(postSave, { coursePhaseId, body: payload }));
  }

  hasJwt(): boolean {
    return localStorage.getItem(GLOBALS.LS_KEY_JWT) !== null;
  }
}
