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
  @Output() coursePhaseSelected = new EventEmitter<CourseIteration>();

  coursePhases: CourseIteration[] = [];
  isLoading = true;
  hasError = false;

  constructor(
    private promptConnectionService: PromptConnectionService,
    private toastsService: ToastsService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCoursePhases();
  }

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

  select(phase: CourseIteration): void {
    if (!phase?.id) return;
    this.coursePhaseSelected.emit(phase);
  }
}
