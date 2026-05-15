import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CourseIteration } from 'src/app/api/models';
import { PromptService } from './prompt.service';

/**
 * Probes PROMPT reachability and caches the course-phase list from that probe.
 * Connection check is simply `GET /tease/course-phases` with the JWT interceptor.
 */
@Injectable({
  providedIn: 'root',
})
export class PromptConnectionService {
  private readonly connectedSubject$ = new BehaviorSubject<boolean>(false);
  private coursePhases: CourseIteration[] = [];
  private probeInFlight: Promise<boolean> | null = null;

  constructor(private promptService: PromptService) {}

  get connected$(): Observable<boolean> {
    return this.connectedSubject$.asObservable();
  }

  /** Probe PROMPT; concurrent callers share the in-flight promise. */
  async probe(): Promise<boolean> {
    if (!this.promptService.hasJwt()) {
      this.coursePhases = [];
      this.connectedSubject$.next(false);
      return false;
    }
    if (this.probeInFlight) return this.probeInFlight;

    this.probeInFlight = (async () => {
      try {
        this.coursePhases = (await this.promptService.getCourseIterations()) ?? [];
        this.connectedSubject$.next(true);
        return true;
      } catch {
        this.coursePhases = [];
        this.connectedSubject$.next(false);
        return false;
      } finally {
        this.probeInFlight = null;
      }
    })();
    return this.probeInFlight;
  }

  findCoursePhase(coursePhaseId: string): CourseIteration | undefined {
    return this.coursePhases.find(phase => phase.id === coursePhaseId);
  }

  /** Returns cached phases when fresh; otherwise re-probes. Empty when unreachable. */
  async listCoursePhases(forceRefresh = false): Promise<CourseIteration[]> {
    if (!forceRefresh && this.promptService.hasJwt() && this.coursePhases.length) {
      return this.coursePhases;
    }
    await this.probe();
    return this.coursePhases;
  }
}
