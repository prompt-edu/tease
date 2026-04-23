import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, Subscription, merge } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, skip } from 'rxjs/operators';

import { PromptService } from './prompt.service';
import { ToastsService } from './toasts.service';
import { ConstraintsService } from '../data/constraints.service';
import { LockedStudentsService } from '../data/locked-students.service';
import { AllocationsService } from '../data/allocations.service';
import { TeaseSaveRequest, TeaseWorkspace, TeaseWorkspaceUpsert } from 'src/app/api/models/tease-workspace';

export type AlgorithmType = 'preferenceMaxLP' | 'constraintOnly';

/**
 * Owns the connection to a single PROMPT course phase workspace.
 *
 * Responsibilities:
 *   - Hydrate constraints / locked students / draft allocations from
 *     `GET /tease/course_phase/{id}/workspace`.
 *   - Track a `dirty` flag that drives the unsaved-changes guard.
 *   - Autosave (debounced) via `PUT /workspace` on any constraint or
 *     lock change. Autosave never writes to the allocations table.
 *   - Expose `saveToPrompt()` for the explicit "Save to PROMPT" button,
 *     which calls `POST /save` (workspace + allocations, single txn).
 *
 * This service is intentionally standalone from the existing
 * `CourseIterationsService` so that Phase 1 can land without rewriting
 * the CSV flow.
 */
@Injectable({
  providedIn: 'root',
})
export class WorkspaceStateService implements OnDestroy {
  /** Debounce window (ms) for autosave after the last edit. */
  private static readonly AUTOSAVE_DEBOUNCE_MS = 2000;

  private readonly coursePhaseIdSubject$ = new BehaviorSubject<string | null>(null);
  private readonly dirtySubject$ = new BehaviorSubject<boolean>(false);
  private readonly hydratedSubject$ = new BehaviorSubject<boolean>(false);
  private readonly savingSubject$ = new BehaviorSubject<boolean>(false);

  private algorithmType: AlgorithmType | null = null;
  private readonly lastSavedAtSubject$ = new BehaviorSubject<string | null>(null);
  private readonly lastExportedAtSubject$ = new BehaviorSubject<string | null>(null);

  private autosaveSub: Subscription | null = null;
  private autosaveTrigger$ = new Subject<void>();

  /** Bound reference so the listener can be removed on destroy/HMR. */
  private readonly beforeUnloadHandler = (event: BeforeUnloadEvent): void => {
    if (this.dirtySubject$.getValue()) {
      event.preventDefault();
      // Legacy browsers require a returnValue string; modern ones
      // show a generic message regardless.
      event.returnValue = '';
    }
  };

  constructor(
    private promptService: PromptService,
    private toastsService: ToastsService,
    private constraintsService: ConstraintsService,
    private lockedStudentsService: LockedStudentsService,
    private allocationsService: AllocationsService
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
    this.stopAutosaveWatcher();
  }

  /* --- observable state --------------------------------------------- */

  get coursePhaseId(): string | null {
    return this.coursePhaseIdSubject$.getValue();
  }

  get coursePhaseId$(): Observable<string | null> {
    return this.coursePhaseIdSubject$.asObservable();
  }

  get dirty(): boolean {
    return this.dirtySubject$.getValue();
  }

  get dirty$(): Observable<boolean> {
    return this.dirtySubject$.asObservable();
  }

  get hydrated$(): Observable<boolean> {
    return this.hydratedSubject$.asObservable();
  }

  get saving$(): Observable<boolean> {
    return this.savingSubject$.asObservable();
  }

  getAlgorithmType(): AlgorithmType | null {
    return this.algorithmType;
  }

  /** ISO timestamp of the last autosave / save to PROMPT, or null. */
  get lastSavedAt$(): Observable<string | null> {
    return this.lastSavedAtSubject$.asObservable();
  }

  /** ISO timestamp of the last explicit "Save to PROMPT" (export), or null. */
  get lastExportedAt$(): Observable<string | null> {
    return this.lastExportedAtSubject$.asObservable();
  }

  setAlgorithmType(algorithmType: AlgorithmType | null): void {
    if (this.algorithmType === algorithmType) return;
    this.algorithmType = algorithmType;
    this.markDirty();
  }

  /* --- hydration ---------------------------------------------------- */

  /**
   * Fetch `GET /workspace` and populate the in-memory editor state.
   * Empty response → blank editor, no error. Network/HTTP errors surface
   * a toast but do not throw; the caller can still render the UI.
   */
  async hydrate(coursePhaseId: string): Promise<void> {
    // Tear down any previous watcher + pending debounce so the replay of
    // constraints/locks/allocations from the new workspace doesn't trip
    // markDirty() on the stale subscription. `autosaveTrigger$` is replaced
    // so a still-pending debounce from before the switch cannot fire.
    this.stopAutosaveWatcher();
    this.autosaveTrigger$ = new Subject<void>();

    this.coursePhaseIdSubject$.next(coursePhaseId);
    this.hydratedSubject$.next(false);

    let workspace: TeaseWorkspace | null = null;
    try {
      workspace = await this.promptService.getWorkspace(coursePhaseId);
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        this.toastsService.showToast(
          `Error ${error.status}: ${error.statusText}`,
          'Workspace load failed',
          false
        );
      } else {
        this.toastsService.showToast('Could not load workspace', 'Workspace load failed', false);
      }
    }

    // Empty / missing workspace → blank editor, no error.
    const constraints = workspace?.constraints ?? [];
    const locks = workspace?.lockedStudents ?? [];
    const draft = workspace?.allocationsDraft ?? [];
    this.algorithmType = (workspace?.algorithmType as AlgorithmType | null) ?? null;
    this.lastSavedAtSubject$.next(workspace?.lastSavedAt ?? null);
    this.lastExportedAtSubject$.next(workspace?.lastExportedAt ?? null);

    // Populate data services without broadcasting WebSocket updates — the
    // hydration is authoritative for this client, not an edit.
    this.constraintsService.setConstraints(constraints, false);
    this.lockedStudentsService.setLocksAsArray(locks, false);
    this.allocationsService.setAllocations(draft, false);

    this.dirtySubject$.next(false);
    this.hydratedSubject$.next(true);

    this.startAutosaveWatcher();
  }

  /* --- dirty flag / autosave ---------------------------------------- */

  /** Mark the workspace as having unsaved changes and schedule autosave. */
  markDirty(): void {
    if (!this.coursePhaseId) return;
    if (!this.dirtySubject$.getValue()) {
      this.dirtySubject$.next(true);
    }
    this.autosaveTrigger$.next();
  }

  /**
   * Subscribe to constraint / lock changes and fire debounced autosaves.
   * Safe to call more than once — subsequent calls are no-ops.
   */
  private startAutosaveWatcher(): void {
    if (this.autosaveSub) return;

    // skip(1): BehaviorSubjects fire their current value immediately on
    // subscribe; we only want *future* edits to mark the workspace dirty.
    // Include allocations$ so drag-drop team changes also mark the
    // workspace dirty (not just constraints/locks).
    const sources$ = merge(
      this.constraintsService.constraints$.pipe(skip(1)),
      this.lockedStudentsService.locks$.pipe(skip(1)),
      this.allocationsService.allocations$.pipe(skip(1))
    );

    this.autosaveSub = new Subscription();
    this.autosaveSub.add(
      sources$.subscribe(() => {
        this.markDirty();
      })
    );
    this.autosaveSub.add(
      this.autosaveTrigger$
        .pipe(debounceTime(WorkspaceStateService.AUTOSAVE_DEBOUNCE_MS))
        .subscribe(() => {
          void this.autosave();
        })
    );
  }

  private stopAutosaveWatcher(): void {
    this.autosaveSub?.unsubscribe();
    this.autosaveSub = null;
  }

  private buildUpsertPayload(): TeaseWorkspaceUpsert {
    const coursePhaseId = this.coursePhaseId;
    return {
      coursePhaseId: coursePhaseId ?? '',
      constraints: this.constraintsService.getConstraints(),
      lockedStudents: Array.from(this.lockedStudentsService.getLocks().entries()),
      allocationsDraft: this.allocationsService.getAllocations(),
      algorithmType: this.algorithmType,
    };
  }

  /**
   * Manually force a draft save (PUT /workspace) without waiting for
   * the debounce. No-op when clean or when no workspace is active.
   * Returns true on success, false otherwise.
   */
  async saveWorkspaceNow(): Promise<boolean> {
    const coursePhaseId = this.coursePhaseId;
    if (!coursePhaseId || !this.dirtySubject$.getValue()) return false;

    this.savingSubject$.next(true);
    try {
      const saved = await this.promptService.putWorkspace(coursePhaseId, this.buildUpsertPayload());
      this.lastSavedAtSubject$.next(saved?.lastSavedAt ?? new Date().toISOString());
      this.dirtySubject$.next(false);
      return true;
    } catch (error) {
      console.warn('Manual workspace save failed', error);
      return false;
    } finally {
      this.savingSubject$.next(false);
    }
  }

  private async autosave(): Promise<void> {
    const coursePhaseId = this.coursePhaseId;
    if (!coursePhaseId || !this.dirtySubject$.getValue()) return;

    this.savingSubject$.next(true);
    try {
      const saved = await this.promptService.putWorkspace(coursePhaseId, this.buildUpsertPayload());
      if (saved?.lastSavedAt) {
        this.lastSavedAtSubject$.next(saved.lastSavedAt);
      } else {
        // Server returned nothing — use client-side time as a best-effort fallback
        this.lastSavedAtSubject$.next(new Date().toISOString());
      }
      this.dirtySubject$.next(false);
    } catch (error) {
      // Autosave failures should not be noisy — the user still has their
      // local edits. Log and keep the dirty flag so we retry on the next
      // change.
      console.warn('Autosave to PROMPT failed', error);
    } finally {
      this.savingSubject$.next(false);
    }
  }

  /**
   * Explicit "Save to PROMPT" — POST /save. Persists workspace + the
   * finalised allocations in a single server-side transaction. Returns
   * `true` on success, `false` otherwise (toast already surfaced).
   */
  async saveToPrompt(): Promise<boolean> {
    const coursePhaseId = this.coursePhaseId;
    if (!coursePhaseId) {
      this.toastsService.showToast('No course phase selected', 'Save failed', false);
      return false;
    }

    const payload: TeaseSaveRequest = {
      ...this.buildUpsertPayload(),
      allocations: this.allocationsService.getAllocations(),
    };

    this.savingSubject$.next(true);
    try {
      const saved = await this.promptService.postSave(coursePhaseId, payload);
      const now = new Date().toISOString();
      this.lastSavedAtSubject$.next(saved?.lastSavedAt ?? now);
      this.lastExportedAtSubject$.next(saved?.lastExportedAt ?? now);
      this.dirtySubject$.next(false);
      this.toastsService.showToast('Saved to PROMPT', 'Save', true);
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        this.toastsService.showToast(
          `Error ${error.status}: ${error.statusText}`,
          'Save failed',
          false
        );
      } else {
        this.toastsService.showToast('Unknown error', 'Save failed', false);
      }
      return false;
    } finally {
      this.savingSubject$.next(false);
    }
  }

  /** Clear all workspace state (e.g. when switching course phases). */
  reset(): void {
    this.stopAutosaveWatcher();
    this.coursePhaseIdSubject$.next(null);
    this.dirtySubject$.next(false);
    this.hydratedSubject$.next(false);
    this.algorithmType = null;
    this.lastSavedAtSubject$.next(null);
    this.lastExportedAtSubject$.next(null);
  }
}
