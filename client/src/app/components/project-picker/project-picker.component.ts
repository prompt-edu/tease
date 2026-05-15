import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CourseIteration } from 'src/app/api/models';
import { PromptConnectionService } from 'src/app/shared/services/prompt-connection.service';

/**
 * Lets the user pick a PROMPT course phase. Emits the chosen phase up to
 * AppComponent, which triggers hydration. Shown only when PROMPT is
 * reachable and no `?coursePhaseId=` is already in the URL.
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

  constructor(private promptConnectionService: PromptConnectionService) {}

  async ngOnInit(): Promise<void> {
    await this.loadCoursePhases();
  }

  async loadCoursePhases(): Promise<void> {
    this.isLoading = true;
    this.coursePhases = await this.promptConnectionService.listCoursePhases(true);
    this.isLoading = false;
  }

  get hasError(): boolean {
    return !this.isLoading && this.coursePhases.length === 0;
  }

  select(phase: CourseIteration): void {
    if (!phase?.id) return;
    this.coursePhaseSelected.emit(phase);
  }
}
