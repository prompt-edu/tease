import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CourseIteration } from 'src/app/api/models';
import { PromptService } from './prompt.service';

/**
 * Probes PROMPT (team_allocation Go server) reachability at app init
 * and exposes the connection state + a helper for listing course phases.
 *
 * Connection check is simply `GET /tease/course-phases` with the JWT
 * interceptor; success → connected, any error → disconnected.
 */
@Injectable({
  providedIn: 'root',
})
export class PromptConnectionService {
  private readonly connectedSubject$ = new BehaviorSubject<boolean>(false);
  private coursePhasesCache: CourseIteration[] | null = null;
  private probeInFlight: Promise<boolean> | null = null;

  constructor(private promptService: PromptService) {}

  /** Observable connection state; `false` until the first successful probe. */
  get connected$(): Observable<boolean> {
    return this.connectedSubject$.asObservable();
  }

  /** Synchronous accessor for the current connection state. */
  isConnected(): boolean {
    return this.connectedSubject$.getValue();
  }

  /**
   * Probe PROMPT by attempting to list course phases. Resolves to `true`
   * when the call succeeds and returns a (possibly empty) array, `false`
   * otherwise. Concurrent callers share the same in-flight promise.
   */
  async probe(): Promise<boolean> {
    if (!this.promptService.isImportPossible()) {
      // JWT missing/expired — drop any stale cache so `listCoursePhases`
      // cannot return pre-logout phase data to an unauthenticated caller.
      this.coursePhasesCache = null;
      this.connectedSubject$.next(false);
      return false;
    }
    if (this.probeInFlight) {
      return this.probeInFlight;
    }

    this.probeInFlight = (async () => {
      try {
        const phases = await this.promptService.getCourseIterations();
        this.coursePhasesCache = phases ?? [];
        this.connectedSubject$.next(true);
        return true;
      } catch {
        this.coursePhasesCache = null;
        this.connectedSubject$.next(false);
        return false;
      } finally {
        this.probeInFlight = null;
      }
    })();

    return this.probeInFlight;
  }

  /**
   * Look up a course phase by id from the cache. Returns `undefined` if
   * the cache is empty or the id is not present. Callers that need a
   * guaranteed-fresh result should `await listCoursePhases(true)` first.
   */
  findCoursePhase(coursePhaseId: string): CourseIteration | undefined {
    return this.coursePhasesCache?.find(phase => phase.id === coursePhaseId);
  }

  /**
   * Return the list of course phases from PROMPT. Re-probes if no cache
   * is available; returns `[]` when PROMPT is unreachable.
   */
  async listCoursePhases(forceRefresh: boolean = false): Promise<CourseIteration[]> {
    // Only serve from cache when the JWT is still present — avoids
    // returning phase data collected before logout/token expiry.
    if (!forceRefresh && this.promptService.isImportPossible() && this.coursePhasesCache) {
      return this.coursePhasesCache;
    }
    const ok = await this.probe();
    if (!ok) {
      return [];
    }
    return this.coursePhasesCache ?? [];
  }
}
