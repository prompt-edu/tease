import { Injectable } from '@angular/core';
import { ApiService } from '../../api/api.service';
import { ApiFnRequired } from '../../api/api.service';
import { teaseCoursePhaseCourseIterationIdProjectsGet as getProjects } from '../../api/fn/projects/tease-course-phase-course-iteration-id-projects-get';
import { teaseCoursePhaseCourseIterationIdSkillsGet as getSkills } from '../../api/fn/skills/tease-course-phase-course-iteration-id-skills-get';
import { teaseCoursePhaseCourseIterationIdStudentsGet as getStudents } from '../../api/fn/students/tease-course-phase-course-iteration-id-students-get';
import { teaseCoursePhaseCourseIterationIdAllocationsGet as getAllocations } from '../../api/fn/allocations/tease-course-phase-course-iteration-id-allocations-get';
import { teaseCoursePhaseCourseIterationIdAllocationsPost as postAllocations } from 'src/app/api/fn/allocations/tease-course-phase-course-iteration-id-allocations-post';
import { teaseCoursePhasesGet as getCourseIterations } from 'src/app/api/fn/course-iterations/tease-course-phases-get';
import { teaseCoursePhaseCoursePhaseIdWorkspaceGet as getWorkspace } from 'src/app/api/fn/workspace/tease-course-phase-course-phase-id-workspace-get';
import { teaseCoursePhaseCoursePhaseIdWorkspacePut as putWorkspace } from 'src/app/api/fn/workspace/tease-course-phase-course-phase-id-workspace-put';
import { teaseCoursePhaseCoursePhaseIdSavePost as postSave } from 'src/app/api/fn/workspace/tease-course-phase-course-phase-id-save-post';
import { Observable, lastValueFrom } from 'rxjs';
import { Skill, Student, Project, Allocation, CourseIteration } from 'src/app/api/models';
import { TeaseSaveRequest, TeaseWorkspace, TeaseWorkspaceUpsert } from 'src/app/api/models/tease-workspace';
import { StrictHttpResponse } from 'src/app/api/strict-http-response';
import { GLOBALS } from '../utils/constants';

@Injectable({
  providedIn: 'root',
})
export class PromptService {
  /** Wires the shared `ApiService` for all generated HTTP fns. */
  constructor(private apiService: ApiService) {}

  /** Internal helper that invokes a generated API fn with a single-parameter payload. */
  private async fetchValue<P, R>(fn: ApiFnRequired<P, R>, courseIterationId?: string): Promise<R> {
    const param: P = { courseIterationId: courseIterationId } as P;
    const values$ = this.apiService.invoke(fn, param);
    return lastValueFrom(values$);
  }

  /** GET /tease/course_phase/{id}/projects — the projects / teams in a course phase. */
  async getProjects(courseIterationId: string): Promise<Project[]> {
    return this.fetchValue(getProjects, courseIterationId);
  }

  /** GET /tease/course_phase/{id}/skills — the skill dictionary for a course phase. */
  async getSkills(courseIterationId: string): Promise<Skill[]> {
    return this.fetchValue(getSkills, courseIterationId);
  }

  /** GET /tease/course_phase/{id}/students — students enriched with attributes. */
  async getStudents(courseIterationId: string): Promise<Student[]> {
    return this.fetchValue(getStudents, courseIterationId);
  }

  /** GET /tease/course_phase/{id}/allocations — the finalised allocations on record. */
  async getAllocations(courseIterationId: string): Promise<Allocation[]> {
    return this.fetchValue(getAllocations, courseIterationId);
  }

  /** POST /tease/course_phase/{id}/allocations — legacy bulk-upsert of allocations only. */
  async postAllocations(allocations: Allocation[], courseIterationId: string): Promise<boolean> {
    const params = {
      courseIterationId: courseIterationId,
      body: allocations,
    };
    const result: Observable<StrictHttpResponse<void>> = this.apiService.invoke$Response(postAllocations, params);
    return (await lastValueFrom(result)).ok;
  }

  /** GET /tease/course-phases — all course phases visible to the current JWT. */
  async getCourseIterations(): Promise<CourseIteration[]> {
    return this.fetchValue(getCourseIterations);
  }

  /**
   * GET /tease/course_phase/{coursePhaseId}/workspace
   * Returns the persisted Tease workspace for this course phase, or an empty
   * default if none exists (200 with empty arrays).
   */
  async getWorkspace(coursePhaseId: string): Promise<TeaseWorkspace> {
    return lastValueFrom(this.apiService.invoke(getWorkspace, { coursePhaseId }));
  }

  /**
   * PUT /tease/course_phase/{coursePhaseId}/workspace
   * Upsert workspace. Does NOT touch the allocations table.
   */
  async putWorkspace(coursePhaseId: string, workspace: TeaseWorkspaceUpsert): Promise<TeaseWorkspace> {
    return lastValueFrom(this.apiService.invoke(putWorkspace, { coursePhaseId, body: workspace }));
  }

  /**
   * POST /tease/course_phase/{coursePhaseId}/save
   * Atomic "save and export": upserts workspace + allocations in a single
   * server-side transaction, stamps last_exported_at.
   */
  async postSave(coursePhaseId: string, payload: TeaseSaveRequest): Promise<TeaseWorkspace> {
    return lastValueFrom(this.apiService.invoke(postSave, { coursePhaseId, body: payload }));
  }

  /** Indicates whether a PROMPT JWT is present in localStorage (i.e. user is logged in). */
  isImportPossible(): boolean {
    return localStorage.getItem(GLOBALS.LS_KEY_JWT) !== null;
  }
}
