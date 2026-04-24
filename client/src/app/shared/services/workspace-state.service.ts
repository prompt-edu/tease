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
  /** Consecutive failures before surfacing a toast + "save failed" pill state. */
  private static readonly AUTOSAVE_FAILURE_THRESHOLD = 2;
  /** Delay before retrying autosave after a failure (independent of user edits). */
  private static readonly AUTOSAVE_RETRY_BACKOFF_MS = 15000;

  private readonly coursePhaseIdSubject$ = new BehaviorSubject<string | null>(null);
  private readonly dirtySubject$ = new BehaviorSubject<boolean>(false);
  private readonly hydratedSubject$ = new BehaviorSubject<boolean>(false);
  private readonly savingSubject$ = new BehaviorSubject<boolean>(false);

  private algorithmType: AlgorithmType | null = null;
  private readonly lastSavedAtSubject$ = new BehaviorSubject<string | null>(null);
  private readonly lastExportedAtSubject$ = new BehaviorSubject<string | null>(null);

  private autosaveSub: Subscription | null = null;
  private autosaveTrigger$ = new Subject<void>();

  /**
   * Monotonic counter bumped on every edit. Used by autosave /
   * saveWorkspaceNow to detect whether the user made further edits
   * while a PUT was in flight, so we don't clear the dirty flag for
   * changes that were never actually sent.
   */
  private editCounter = 0;

  /** Count of consecutive failed autosaves; resets on the next success. */
  private consecutiveFailures = 0;
  /** Drives the "save failed" pill state in the header. */
  private readonly saveFailedSubject$ = new BehaviorSubject<boolean>(false);
  /** Handle for the backoff retry timer, so we can cancel on destroy / reset. */
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  /** Bound reference so the listener can be removed on destroy/HMR. */
  private readonly beforeUnloadHandler = (event: BeforeUnloadEvent): void => {
    if (this.dirtySubject$.getValue()) {
      event.preventDefault();
      // Legacy browsers require a returnValue string; modern ones
      // show a generic message regardless.
      event.returnValue = '';
    }
  };

  /** Registers the `beforeunload` handler; all other state is lazy. */
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

  /** Angular lifecycle — remove the beforeunload listener and tear down autosave. */
  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
    this.stopAutosaveWatcher();
    this.clearRetryTimer();
  }

  /* --- observable state --------------------------------------------- */

  /** Synchronous snapshot of the currently hydrated course phase id. */
  get coursePhaseId(): string | null {
    return this.coursePhaseIdSubject$.getValue();
  }

  /** Observable of the currently hydrated course phase id. */
  get coursePhaseId$(): Observable<string | null> {
    return this.coursePhaseIdSubject$.asObservable();
  }

  /** Synchronous snapshot of the unsaved-changes flag. */
  get dirty(): boolean {
    return this.dirtySubject$.getValue();
  }

  /** Observable of the unsaved-changes flag. */
  get dirty$(): Observable<boolean> {
    return this.dirtySubject$.asObservable();
  }

  /** Emits once hydration finishes (true) or when a new hydration starts (false). */
  get hydrated$(): Observable<boolean> {
    return this.hydratedSubject$.asObservable();
  }

  /** Emits true while any save / autosave network call is in flight. */
  get saving$(): Observable<boolean> {
    return this.savingSubject$.asObservable();
  }

  /**
   * Emits true after {@link AUTOSAVE_FAILURE_THRESHOLD} consecutive
   * autosave failures. Resets to false on the next successful save.
   * Used by the nav-bar pill to surface a "Save failed – retrying"
   * state so users don't assume edits are being persisted when the
   * backend is unreachable.
   */
  get saveFailed$(): Observable<boolean> {
    return this.saveFailedSubject$.asObservable();
  }

  /** Currently selected matching algorithm (or null if none picked). */
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

  /**
   * Update the selected matching algorithm. Marks the workspace dirty
   * so the change is captured by the next autosave.
   */
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

    // User switched workspaces (or reset) while GET /workspace was in
    // flight — drop this stale response instead of overwriting the newer
    // state. Mirrors the snapshot-and-compare guard used by
    // runPutWorkspace and saveToPrompt.
    if (this.coursePhaseId !== coursePhaseId) {
      return;
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
    this.editCounter++;
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
   * the debounce. No-op when clean, when no workspace is active, or
   * when another save is already in flight (in which case an autosave
   * is scheduled so the latest edits are not lost).
   * Returns true on success, false otherwise.
   */
  async saveWorkspaceNow(): Promise<boolean> {
    if (!this.coursePhaseId || !this.dirtySubject$.getValue()) return false;
    if (this.savingSubject$.getValue()) {
      // A save is already running — let it finish; the dirty flag will
      // drive the follow-up autosave.
      this.autosaveTrigger$.next();
      return false;
    }
    return this.runPutWorkspace('Manual workspace save failed');
  }

  private async autosave(): Promise<void> {
    if (!this.coursePhaseId || !this.dirtySubject$.getValue()) return;
    if (this.savingSubject$.getValue()) {
      // Another save is in flight — re-arm the debounce so the current
      // edits still get persisted after it completes.
      this.autosaveTrigger$.next();
      return;
    }
    await this.runPutWorkspace('Autosave to PROMPT failed');
  }

  /**
   * Shared draft-save implementation for both autosave and manual save.
   * Captures the edit counter before the PUT; if `markDirty` is called
   * mid-flight the dirty flag is preserved and another save is
   * scheduled so no edits are lost. Guarded by the caller against
   * concurrent invocations.
   */
  private async runPutWorkspace(errorLogMessage: string): Promise<boolean> {
    const snapshotCoursePhaseId = this.coursePhaseId;
    if (!snapshotCoursePhaseId) return false;

    const snapshotEdits = this.editCounter;
    const payload = this.buildUpsertPayload();

    this.savingSubject$.next(true);
    try {
      const saved = await this.promptService.putWorkspace(snapshotCoursePhaseId, payload);

      // Bail out of UI mutations if the user has switched workspaces
      // mid-flight — the response no longer corresponds to the
      // currently-displayed phase.
      if (this.coursePhaseId !== snapshotCoursePhaseId) {
        return true;
      }

      this.lastSavedAtSubject$.next(saved?.lastSavedAt ?? new Date().toISOString());

      if (this.editCounter === snapshotEdits) {
        // No edits arrived while the PUT was in flight → workspace is
        // truly clean now.
        this.dirtySubject$.next(false);
      } else {
        // User kept editing while we were saving — the payload we just
        // sent is stale. Keep dirty=true and re-arm the debounce so the
        // next autosave picks up the newer state.
        this.autosaveTrigger$.next();
      }

      // Success: clear the failure streak + surface a recovery toast if
      // we had previously been signalling trouble.
      if (this.saveFailedSubject$.getValue()) {
        this.toastsService.showToast('Workspace is saving again.', 'Save recovered', true);
      }
      this.consecutiveFailures = 0;
      this.saveFailedSubject$.next(false);
      this.clearRetryTimer();
      return true;
    } catch (error) {
      // Keep the dirty flag so the next edit re-triggers a save attempt.
      console.warn(errorLogMessage, error);
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= WorkspaceStateService.AUTOSAVE_FAILURE_THRESHOLD) {
        if (!this.saveFailedSubject$.getValue()) {
          this.saveFailedSubject$.next(true);
          this.toastsService.showToast(
            'Your edits are NOT being saved. Will keep retrying.',
            'Save failed',
            false
          );
        }
        // Schedule a time-based retry so we don't rely purely on the
        // user continuing to edit to drive reconnection attempts.
        this.scheduleRetry();
      }
      return false;
    } finally {
      this.savingSubject$.next(false);
    }
  }

  /** Arm a single retry via the autosave pipeline after the backoff window. */
  private scheduleRetry(): void {
    this.clearRetryTimer();
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.dirtySubject$.getValue()) {
        this.autosaveTrigger$.next();
      }
    }, WorkspaceStateService.AUTOSAVE_RETRY_BACKOFF_MS);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Explicit "Save to PROMPT" — POST /save. Persists workspace + the
   * finalised allocations in a single server-side transaction.
   *
   * Mirrors the snapshot-and-compare + in-flight guard used by
   * runPutWorkspace so the explicit-publish path can't:
   *  - clobber state for a workspace the user has switched away from,
   *  - swallow edits that arrive during the in-flight POST,
   *  - or run two POSTs in parallel and flicker savingSubject$.
   *
   * Returns `true` on success, `false` otherwise (toast already surfaced).
   */
  async saveToPrompt(): Promise<boolean> {
    const snapshotCoursePhaseId = this.coursePhaseId;
    if (!snapshotCoursePhaseId) {
      this.toastsService.showToast('No course phase selected', 'Save failed', false);
      return false;
    }
    if (this.savingSubject$.getValue()) {
      // Another save is already running. Re-arm autosave so the latest
      // edits eventually get through, but don't fire a second POST.
      this.autosaveTrigger$.next();
      return false;
    }

    const snapshotEdits = this.editCounter;
    const payload: TeaseSaveRequest = {
      ...this.buildUpsertPayload(),
      allocations: this.allocationsService.getAllocations(),
    };

    this.savingSubject$.next(true);
    try {
      const saved = await this.promptService.postSave(snapshotCoursePhaseId, payload);

      // Bail out of state mutations if the user has switched workspaces
      // while we were waiting on the server — the response is no longer
      // about the currently-displayed phase.
      if (this.coursePhaseId !== snapshotCoursePhaseId) {
        return true;
      }

      const now = new Date().toISOString();
      this.lastSavedAtSubject$.next(saved?.lastSavedAt ?? now);
      this.lastExportedAtSubject$.next(saved?.lastExportedAt ?? now);

      if (this.editCounter === snapshotEdits) {
        // No edits arrived during the POST — the workspace is truly clean.
        this.dirtySubject$.next(false);
      } else {
        // User kept editing while we were saving — those edits weren't
        // in the payload. Keep dirty=true and re-arm autosave so the
        // newer state is persisted on the next debounce.
        this.autosaveTrigger$.next();
      }

      // Treat an explicit save as a recovery signal for the failure-streak
      // counter, same as runPutWorkspace does.
      if (this.saveFailedSubject$.getValue()) {
        this.toastsService.showToast('Workspace is saving again.', 'Save recovered', true);
      }
      this.consecutiveFailures = 0;
      this.saveFailedSubject$.next(false);
      this.clearRetryTimer();

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

  /**
   * Clear all workspace state, including the downstream data services
   * (constraints, locked students, allocations). Use when leaving the
   * workspace entirely (e.g. disconnect from PROMPT or a cancelled
   * project-switcher flow). When switching to a new course phase,
   * prefer calling `hydrate(newId)` directly — it handles teardown
   * internally without flashing empty state to the UI.
   */
  reset(): void {
    this.stopAutosaveWatcher();
    this.clearRetryTimer();
    this.coursePhaseIdSubject$.next(null);
    this.dirtySubject$.next(false);
    this.hydratedSubject$.next(false);
    this.algorithmType = null;
    this.lastSavedAtSubject$.next(null);
    this.lastExportedAtSubject$.next(null);
    this.saveFailedSubject$.next(false);
    this.consecutiveFailures = 0;
    this.editCounter = 0;

    // Drop the previously-hydrated workspace data so the UI doesn't
    // keep rendering stale constraints/locks/allocations. Skip
    // WebSocket broadcasts — the reset is local, not collaborative.
    this.constraintsService.setConstraints([], false);
    this.lockedStudentsService.setLocksAsArray([], false);
    this.allocationsService.setAllocations([], false);
  }
}
