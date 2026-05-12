import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CourseIteration } from 'src/app/api/models';
import { PromptConnectionService } from 'src/app/shared/services/prompt-connection.service';
import { ToastsService } from 'src/app/shared/services/toasts.service';

/**
 * Renders a list of PROMPT course phases (Workflow A). Emits the
 * selected `coursePhaseId` so the host component can trigger hydration
 * and navigate to the matchmaking route.
 *
 * Shown only when `PromptConnectionService.connected$` is true and the
 * URL does not already carry a `coursePhaseId` query param.
 */
@Component({
  selector: 'app-project-picker',
  templateUrl: './project-picker.component.html',
  styleUrls: ['./project-picker.component.scss'],
  standalone: false,
})
export class ProjectPickerComponent implements OnInit {
  /** Fires when the user picks a course phase; consumed by AppComponent. */
  @Output() coursePhaseSelected = new EventEmitter<CourseIteration>();

  /** Course phases returned by the PROMPT probe; empty until loaded. */
  coursePhases: CourseIteration[] = [];
  /** True while the initial (or retry) fetch is in flight. */
  isLoading = true;
  /** True when the fetch failed; drives the retry button UI. */
  hasError = false;

  /** @param promptConnectionService source of PROMPT course phases.
   *  @param toastsService surfaces load errors to the user. */
  constructor(
    private promptConnectionService: PromptConnectionService,
    private toastsService: ToastsService
  ) {}

  /** Angular lifecycle hook — kicks off the initial fetch. */
  async ngOnInit(): Promise<void> {
    await this.loadCoursePhases();
  }

  /**
   * Fetch the list of course phases from PROMPT (force-refresh the cache).
   * Failures set `hasError = true` and surface a toast; the empty-state
   * message lives in the template.
   */
  async loadCoursePhases(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;
    try {
      this.coursePhases = await this.promptConnectionService.listCoursePhases(true);
      // Empty-state UI is rendered in the template; no toast needed.
    } catch {
      this.hasError = true;
      this.toastsService.showToast(
        'Could not load course phases from PROMPT.',
        'Project picker',
        false
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Emit the chosen course phase up to `AppComponent`, which will update
   * the URL and hydrate the workspace. No-op for a missing id.
   */
  select(phase: CourseIteration): void {
    if (!phase?.id) return;
    this.coursePhaseSelected.emit(phase);
  }
}
