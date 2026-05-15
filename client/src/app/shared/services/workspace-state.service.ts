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

const AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * Owns the connection to a single PROMPT course phase workspace:
 *   - hydrate from `GET /workspace`
 *   - track dirty / saving state
 *   - debounced autosave via `PUT /workspace` (constraints, locks, draft)
 *   - explicit publish via `POST /save` (workspace + allocations, single txn)
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceStateService implements OnDestroy {
  private readonly coursePhaseIdSubject$ = new BehaviorSubject<string | null>(null);
  private readonly dirtySubject$ = new BehaviorSubject<boolean>(false);
  private readonly savingSubject$ = new BehaviorSubject<boolean>(false);
  private readonly lastSavedAtSubject$ = new BehaviorSubject<string | null>(null);
  private readonly lastExportedAtSubject$ = new BehaviorSubject<string | null>(null);

  private autosaveSub: Subscription | null = null;
  private autosaveTrigger$ = new Subject<void>();

  /** Bumped on every edit; used to detect edits that arrive while a PUT is in flight. */
  private editCounter = 0;

  private readonly beforeUnloadHandler = (event: BeforeUnloadEvent): void => {
    if (this.dirtySubject$.getValue()) {
      event.preventDefault();
    }
  };

  constructor(
    private promptService: PromptService,
    private toastsService: ToastsService,
    private constraintsService: ConstraintsService,
    private lockedStudentsService: LockedStudentsService,
    private allocationsService: AllocationsService
  ) {
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    this.stopAutosaveWatcher();
  }

  get coursePhaseId(): string | null {
    return this.coursePhaseIdSubject$.getValue();
  }
  get coursePhaseId$(): Observable<string | null> {
    return this.coursePhaseIdSubject$.asObservable();
  }
  get dirty$(): Observable<boolean> {
    return this.dirtySubject$.asObservable();
  }
  get saving$(): Observable<boolean> {
    return this.savingSubject$.asObservable();
  }
  get lastSavedAt$(): Observable<string | null> {
    return this.lastSavedAtSubject$.asObservable();
  }
  get lastExportedAt$(): Observable<string | null> {
    return this.lastExportedAtSubject$.asObservable();
  }

  /**
   * Fetch `GET /workspace` and populate the in-memory editor state.
   * Errors surface a toast and leave a blank editor; never throws.
   */
  async hydrate(coursePhaseId: string): Promise<void> {
    // Replace the trigger Subject so a still-pending debounce from the previous
    // workspace cannot fire against the new one.
    this.stopAutosaveWatcher();
    this.autosaveTrigger$ = new Subject<void>();

    this.coursePhaseIdSubject$.next(coursePhaseId);

    let workspace: TeaseWorkspace | null = null;
    try {
      workspace = await this.promptService.getWorkspace(coursePhaseId);
    } catch (error) {
      this.toastsService.showToast(this.errorMessage(error), 'Workspace load failed', false);
    }

    // User switched workspaces mid-flight — drop the stale response.
    if (this.coursePhaseId !== coursePhaseId) return;

    this.lastSavedAtSubject$.next(workspace?.lastSavedAt ?? null);
    this.lastExportedAtSubject$.next(workspace?.lastExportedAt ?? null);

    // `false` = don't broadcast over websocket; hydration is authoritative, not an edit.
    this.constraintsService.setConstraints(workspace?.constraints ?? [], false);
    this.lockedStudentsService.setLocksAsArray(workspace?.lockedStudents ?? [], false);
    this.allocationsService.setAllocations(workspace?.allocationsDraft ?? [], false);

    this.editCounter = 0;
    this.dirtySubject$.next(false);
    this.startAutosaveWatcher();
  }

  /** Drop all workspace state and disconnect. Use on logout / leave-workspace. */
  reset(): void {
    this.stopAutosaveWatcher();
    this.coursePhaseIdSubject$.next(null);
    this.editCounter = 0;
    this.dirtySubject$.next(false);
    this.lastSavedAtSubject$.next(null);
    this.lastExportedAtSubject$.next(null);
    this.constraintsService.setConstraints([], false);
    this.lockedStudentsService.setLocksAsArray([], false);
    this.allocationsService.setAllocations([], false);
  }

  /** Force an immediate draft save. No-op when clean or already saving. */
  async saveWorkspaceNow(): Promise<boolean> {
    if (!this.coursePhaseId || !this.dirtySubject$.getValue() || this.savingSubject$.getValue()) {
      return false;
    }
    return this.runPutWorkspace();
  }

  /** Explicit publish: workspace + finalised allocations in one transaction. */
  async saveToPrompt(): Promise<boolean> {
    const phaseId = this.coursePhaseId;
    if (!phaseId) {
      this.toastsService.showToast('No course phase selected', 'Save failed', false);
      return false;
    }
    if (this.savingSubject$.getValue()) return false;

    const payload: TeaseSaveRequest = {
      ...this.buildUpsertPayload(),
      allocations: this.allocationsService.getAllocations(),
    };
    const editsAtStart = this.editCounter;

    this.savingSubject$.next(true);
    try {
      const saved = await this.promptService.postSave(phaseId, payload);
      if (this.coursePhaseId !== phaseId) return true;

      const now = new Date().toISOString();
      this.lastSavedAtSubject$.next(saved?.lastSavedAt ?? now);
      this.lastExportedAtSubject$.next(saved?.lastExportedAt ?? now);
      if (this.editCounter === editsAtStart) this.dirtySubject$.next(false);
      this.toastsService.showToast('Saved to PROMPT', 'Save', true);
      return true;
    } catch (error) {
      this.toastsService.showToast(this.errorMessage(error), 'Save failed', false);
      return false;
    } finally {
      this.savingSubject$.next(false);
    }
  }

  private startAutosaveWatcher(): void {
    if (this.autosaveSub) return;

    // skip(1): BehaviorSubjects replay their current value on subscribe; we only
    // want *future* edits to mark the workspace dirty.
    const edits$ = merge(
      this.constraintsService.constraints$.pipe(skip(1)),
      this.lockedStudentsService.locks$.pipe(skip(1)),
      this.allocationsService.allocations$.pipe(skip(1))
    );

    this.autosaveSub = new Subscription();
    this.autosaveSub.add(
      edits$.subscribe(() => {
        if (!this.coursePhaseId) return;
        this.editCounter++;
        if (!this.dirtySubject$.getValue()) this.dirtySubject$.next(true);
        this.autosaveTrigger$.next();
      })
    );
    this.autosaveSub.add(
      this.autosaveTrigger$.pipe(debounceTime(AUTOSAVE_DEBOUNCE_MS)).subscribe(() => {
        if (!this.savingSubject$.getValue() && this.dirtySubject$.getValue()) {
          void this.runPutWorkspace();
        }
      })
    );
  }

  private stopAutosaveWatcher(): void {
    this.autosaveSub?.unsubscribe();
    this.autosaveSub = null;
  }

  private buildUpsertPayload(): TeaseWorkspaceUpsert {
    return {
      coursePhaseId: this.coursePhaseId ?? '',
      constraints: this.constraintsService.getConstraints(),
      lockedStudents: Array.from(this.lockedStudentsService.getLocks().entries()),
      allocationsDraft: this.allocationsService.getAllocations(),
      algorithmType: null,
    };
  }

  private async runPutWorkspace(): Promise<boolean> {
    const phaseId = this.coursePhaseId;
    if (!phaseId) return false;

    const editsAtStart = this.editCounter;
    this.savingSubject$.next(true);
    try {
      const saved = await this.promptService.putWorkspace(phaseId, this.buildUpsertPayload());
      if (this.coursePhaseId !== phaseId) return true;

      this.lastSavedAtSubject$.next(saved?.lastSavedAt ?? new Date().toISOString());
      // Only clear dirty if no edits arrived while the PUT was in flight —
      // otherwise the unsent edits would lose their unsaved-changes signal.
      if (this.editCounter === editsAtStart) this.dirtySubject$.next(false);
      return true;
    } catch (error) {
      console.warn('Autosave failed', error);
      return false;
    } finally {
      this.savingSubject$.next(false);
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) return `Error ${error.status}: ${error.statusText}`;
    return 'Unknown error';
  }
}
