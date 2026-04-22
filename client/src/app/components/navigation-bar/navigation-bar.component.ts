import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { OverlayService } from 'src/app/overlay.service';
import { ConfirmationOverlayComponent } from '../confirmation-overlay/confirmation-overlay.component';
import { ExportOverlayComponent } from '../export-overlay/export-overlay.component';
import { ImportOverlayComponent } from '../import-overlay/import-overlay.component';
import { AllocationsService } from 'src/app/shared/data/allocations.service';
import { ProjectsService } from 'src/app/shared/data/projects.service';
import { SkillsService } from 'src/app/shared/data/skills.service';
import { StudentsService } from 'src/app/shared/data/students.service';
import { ConstraintsService } from 'src/app/shared/data/constraints.service';
import { teaseIconPack } from 'src/assets/icons/icons';
import { LockedStudentsService } from 'src/app/shared/data/locked-students.service';
import { ConstraintBuilderOverlayComponent } from '../constraint-builder-overlay/constraint-builder-overlay.component';
import { ConstraintSummaryComponent } from '../constraint-summary-view/constraint-summary.component';
import { StudentSortService } from 'src/app/shared/services/student-sort.service';
import { AllocationData } from 'src/app/shared/models/allocation-data';
import { CourseIterationsService } from 'src/app/shared/data/course-iteration.service';
import { WebsocketService } from 'src/app/shared/network/websocket.service';
import { CollaborationService } from 'src/app/shared/services/collaboration.service';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { WorkspaceStateService } from 'src/app/shared/services/workspace-state.service';
import { PromptConnectionService } from 'src/app/shared/services/prompt-connection.service';
import { Observable, combineLatest, map } from 'rxjs';
import { CourseIteration } from 'src/app/api/models';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrl: './navigation-bar.component.scss',
  standalone: false,
})
export class NavigationBarComponent implements OnInit, OnChanges {
  facGroupsIcon = teaseIconPack['facGroupsIcon'];
  facDeleteIcon = teaseIconPack['facDeleteIcon'];
  facMoreIcon = teaseIconPack['facMoreIcon'];
  facImportIcon = teaseIconPack['facImportIcon'];
  facExportIcon = teaseIconPack['facExportIcon'];
  facRestartIcon = teaseIconPack['facRestartIcon'];
  facSkillCircleIcon = teaseIconPack['facSkillCircleIcon'];
  facSkillSideIcon = teaseIconPack['facSkillSideIcon'];
  facSkillDeathIcon = teaseIconPack['facSkillDeathIcon'];
  facAddIcon = teaseIconPack['facAddIcon'];
  facSortIcon = teaseIconPack['facSortIcon'];
  facCheckIcon = teaseIconPack['facCheckIcon'];
  facErrorIcon = teaseIconPack['facErrorIcon'];

  @Input({ required: true }) allocationData: AllocationData;

  /** Emits a course-phase selection from the project-switcher dropdown in the header. */
  @Output() coursePhaseSelected = new EventEmitter<CourseIteration>();

  dropdownItems: { action: () => void; icon: IconDefinition; label: string; class: string }[];

  fulfillsAllConstraints = true;

  /** Emits true when the user is editing a PROMPT-backed workspace (not CSV mode). */
  readonly workspaceActive$: Observable<boolean>;
  /** "Saving…" in-flight flag from the workspace service. */
  readonly workspaceSaving$: Observable<boolean>;
  /** Dirty / has-unsaved-changes flag. */
  readonly workspaceDirty$: Observable<boolean>;
  /** Three-way label for the status pill: saving | unsaved | saved. */
  readonly saveStatusLabel$: Observable<'saving' | 'unsaved' | 'saved'>;
  /** Observable PROMPT connection state (drives the project-switcher dropdown). */
  readonly promptConnected$: Observable<boolean>;
  /** Human-readable tooltip for the Save button ("Last saved 14:32" / "Not yet saved"). */
  readonly saveTooltip$: Observable<string>;

  /** Course phases available for switching (excludes the currently open one). */
  availablePhases: CourseIteration[] = [];
  loadingPhases = false;

  constructor(
    private overlayService: OverlayService,
    private allocationsService: AllocationsService,
    private studentsService: StudentsService,
    private projectsService: ProjectsService,
    private skillsService: SkillsService,
    private constraintsService: ConstraintsService,
    private lockedStudentsService: LockedStudentsService,
    private studentSortService: StudentSortService,
    private courseIterationsService: CourseIterationsService,
    private collaborationService: CollaborationService,
    public websocketService: WebsocketService,
    private workspaceStateService: WorkspaceStateService,
    private promptConnectionService: PromptConnectionService
  ) {
    this.workspaceActive$ = this.workspaceStateService.coursePhaseId$.pipe(map(id => !!id));
    this.workspaceSaving$ = this.workspaceStateService.saving$;
    this.workspaceDirty$ = this.workspaceStateService.dirty$;
    this.saveStatusLabel$ = combineLatest([this.workspaceSaving$, this.workspaceDirty$]).pipe(
      map(([saving, dirty]) => (saving ? 'saving' : dirty ? 'unsaved' : 'saved'))
    );
    // Either the probe marked us connected, OR we've already hydrated a
    // workspace — a workspace is only ever created after a successful
    // PROMPT fetch, so `coursePhaseId != null` is itself proof of
    // connectivity. This makes the header dropdown robust on the
    // query-param launch path, where the probe may not have completed
    // by the time the nav bar mounts.
    this.promptConnected$ = combineLatest([
      this.promptConnectionService.connected$,
      this.workspaceStateService.coursePhaseId$,
    ]).pipe(map(([connected, coursePhaseId]) => connected || !!coursePhaseId));

    this.saveTooltip$ = combineLatest([
      this.workspaceStateService.lastSavedAt$,
      this.workspaceStateService.lastExportedAt$,
    ]).pipe(
      map(([lastSavedAt, lastExportedAt]) => {
        const parts: string[] = [];
        if (lastExportedAt) {
          parts.push(`Last exported to PROMPT: ${this.formatTimestamp(lastExportedAt)}`);
        }
        if (lastSavedAt) {
          parts.push(`Last autosave: ${this.formatTimestamp(lastSavedAt)}`);
        }
        if (parts.length === 0) {
          return 'Not yet saved — click to save workspace and allocations to PROMPT';
        }
        return parts.join(' • ');
      })
    );
  }

  /** Render an ISO timestamp as a short, locale-aware date + time string. */
  private formatTimestamp(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const today = new Date();
    const sameDay =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `today at ${time}`;
    return `${date.toLocaleDateString()} ${time}`;
  }

  ngOnInit(): void {
    this.updateFulfillsAllConstraints();

    this.dropdownItems = [
      { action: this.showExportOverlay, icon: this.facExportIcon, label: 'Export', class: 'text-dark' },
      { action: this.showImportOverlay, icon: this.facImportIcon, label: 'Import', class: 'text-dark' },
      { action: this.showResetConfirmation, icon: this.facRestartIcon, label: 'Restart', class: 'text-dark' },
      { action: this.showDeleteConfirmation, icon: this.facDeleteIcon, label: 'Delete', class: 'text-warn' },
    ];
  }

  ngOnChanges(): void {
    this.updateFulfillsAllConstraints();
  }

  async connect(): Promise<void> {
    await this.collaborationService.connect(this.allocationData.courseIteration.id);
  }

  async disconnect(): Promise<void> {
    await this.collaborationService.disconnect();
  }

  showConstraintSummaryOverlay(): void {
    this.overlayService.displayComponent(ConstraintSummaryComponent);
  }

  showConstraintBuilderOverlay(): void {
    this.overlayService.displayComponent(ConstraintBuilderOverlayComponent, {
      onClosed: () => this.overlayService.closeOverlay(),
    });
  }

  showResetConfirmation = () => {
    const overlayData = {
      title: 'Reset Team Allocation',
      description:
        'Are you sure you want to reset the team allocation? Resetting the team allocation will unpin all students and remove them from their projects. This action cannot be undone.',
      primaryText: 'Reset',
      primaryButtonClass: 'btn-warn',
      primaryAction: () => {
        this.deleteDynamicData();
        this.overlayService.closeOverlay();
      },
    };

    this.overlayService.displayComponent(ConfirmationOverlayComponent, overlayData);
  };

  showImportOverlay = () => {
    this.overlayService.displayComponent(ImportOverlayComponent);
  };

  showExportOverlay = () => {
    this.overlayService.displayComponent(ExportOverlayComponent, {
      allocationData: this.allocationData,
    });
  };

  saveToPrompt = async (): Promise<void> => {
    await this.workspaceStateService.saveToPrompt();
  };

  /**
   * Populate the project-switcher dropdown with the other course phases
   * available on PROMPT. Excludes the currently open phase. Re-fetches
   * every time the dropdown opens so the list is fresh.
   */
  async loadAvailablePhases(): Promise<void> {
    if (!this.promptConnectionService.isConnected()) {
      this.availablePhases = [];
      return;
    }
    this.loadingPhases = true;
    try {
      const phases = await this.promptConnectionService.listCoursePhases(true);
      const currentId = this.allocationData?.courseIteration?.id;
      this.availablePhases = phases.filter(p => p.id !== currentId);
    } catch (_err) {
      this.availablePhases = [];
    } finally {
      this.loadingPhases = false;
    }
  }

  /**
   * Switch to a different course phase. Warns when there are unsaved
   * changes; the autosave (2 s debounce) may not have fired yet.
   */
  async switchCoursePhase(phase: CourseIteration): Promise<void> {
    if (!phase?.id) return;
    if (this.workspaceStateService.dirty) {
      const proceed = window.confirm(
        'You have unsaved changes in the current workspace. Switch projects anyway? Unsaved edits may be lost.'
      );
      if (!proceed) return;
    }
    this.coursePhaseSelected.emit(phase);
  }

  showSortConfirmation() {
    const overlayData = {
      title: 'Sort Students',
      description: 'Sort students inside projects by their intro course proficiency. This action cannot be undone.',
      primaryText: 'Sort Students',
      primaryAction: () => {
        this.allocationsService.setAllocations(
          this.studentSortService.sortStudentsInAllocations(
            this.studentsService.getStudents(),
            this.allocationsService.getAllocations()
          )
        );
        this.overlayService.closeOverlay();
      },
    };
    this.overlayService.displayComponent(ConfirmationOverlayComponent, overlayData);
  }

  showDeleteConfirmation = () => {
    const overlayData = {
      title: 'Delete',
      description:
        'Permanently erase all data, including students, allocations and constraints. This action cannot be undone.',
      primaryText: 'Delete',
      primaryButtonClass: 'btn-warn',
      primaryAction: () => {
        this.deleteData();
        this.overlayService.closeOverlay();
      },
      secondaryText: 'Keep Data',
    };

    this.overlayService.displayComponent(ConfirmationOverlayComponent, overlayData);
  };

  private deleteData() {
    this.studentsService.deleteStudents();
    this.projectsService.deleteProjects();
    this.allocationsService.deleteAllocations();
    this.skillsService.deleteSkills();

    this.constraintsService.deleteConstraints();
    this.courseIterationsService.setCourseIteration();

    this.overlayService.closeOverlay();
  }

  private deleteDynamicData() {
    this.lockedStudentsService.deleteLocks();
    this.allocationsService.deleteAllocations();
  }

  private updateFulfillsAllConstraints(): void {
    this.fulfillsAllConstraints = this.allocationData.projectsData.every(project => project.fulfillsAllConstraints);
  }
}
