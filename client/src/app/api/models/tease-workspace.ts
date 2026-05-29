/* tslint:disable */
/* eslint-disable */
import { Allocation } from './allocation';
import { ConstraintWrapper } from '../../shared/matching/constraints/constraint';

/**
 * Persisted Tease workspace for a course phase, stored by PROMPT in
 * team_allocation.tease_workspace.
 */
export interface TeaseWorkspace {
  coursePhaseId: string;
  constraints: ConstraintWrapper[];
  /** [studentId, projectId] pairs */
  lockedStudents: Array<[string, string]>;
  allocationsDraft: Allocation[];
  algorithmType?: 'preferenceMaxLP' | 'constraintOnly' | null;
  lastSavedAt?: string | null;
  lastExportedAt?: string | null;
  updatedBy?: string | null;
}

/**
 * Request body for PUT /tease/course_phase/{id}/workspace.
 * Excludes server-managed timestamps.
 */
export type TeaseWorkspaceUpsert = Omit<
  TeaseWorkspace,
  'lastSavedAt' | 'lastExportedAt' | 'updatedBy'
>;

/**
 * Request body for POST /tease/course_phase/{id}/save — the workspace
 * payload plus the finalised allocations that should be upserted into
 * the allocations table as part of the same DB transaction.
 */
export interface TeaseSaveRequest extends TeaseWorkspaceUpsert {
  allocations: Allocation[];
}
