import { Component, Input, OnChanges, OnInit } from '@angular/core';
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
import { Observable, combineLatest, map } from 'rxjs';

type SaveStatus = 'saving' | 'unsaved' | 'saved' | 'failed';

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
  facAddIcon = teaseIconPack['facAddIcon'];
  facSortIcon = teaseIconPack['facSortIcon'];
  facCheckIcon = teaseIconPack['facCheckIcon'];
  facErrorIcon = teaseIconPack['facErrorIcon'];

  @Input({ required: true }) allocationData: AllocationData;

  dropdownItems: { action: () => void; icon: IconDefinition; label: string; class: string }[];

  fulfillsAllConstraints = true;

  /** True when editing a PROMPT-backed workspace (not CSV-only mode). */
  readonly workspaceActive$: Observable<boolean>;
  readonly saveStatus$: Observable<SaveStatus>;
  readonly saveTooltip$: Observable<string>;
  readonly workspaceSavedTooltip$: Observable<string>;

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
    private workspaceStateService: WorkspaceStateService
  ) {
    this.workspaceActive$ = this.workspaceStateService.coursePhaseId$.pipe(map(id => !!id));
    this.saveStatus$ = combineLatest([
      this.workspaceStateService.saving$,
      this.workspaceStateService.saveFailed$,
      this.workspaceStateService.dirty$,
    ]).pipe(
      map(([saving, saveFailed, dirty]) => (saving ? 'saving' : saveFailed ? 'failed' : dirty ? 'unsaved' : 'saved'))
    );

    this.saveTooltip$ = this.workspaceStateService.lastExportedAt$.pipe(
      map(t => (t ? `Last saved to PROMPT: ${this.formatTimestamp(t)}` : 'Click to save allocations to PROMPT'))
    );
    this.workspaceSavedTooltip$ = this.workspaceStateService.lastSavedAt$.pipe(
      map(t => (t ? `Last saved: ${this.formatTimestamp(t)}` : 'Workspace is up to date'))
    );
  }

  private formatTimestamp(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const today = new Date();
    const sameDay =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    return sameDay ? `today at ${time}` : `${date.toLocaleDateString()} ${time}`;
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
    this.overlayService.displayComponent(ConfirmationOverlayComponent, {
      title: 'Reset Team Allocation',
      description:
        'Are you sure you want to reset the team allocation? Resetting will unpin all students and remove them from their projects. This action cannot be undone.',
      primaryText: 'Reset',
      primaryButtonClass: 'btn-warn',
      primaryAction: () => {
        this.lockedStudentsService.deleteLocks();
        this.allocationsService.deleteAllocations();
        this.overlayService.closeOverlay();
      },
    });
  };

  showImportOverlay = () => this.overlayService.displayComponent(ImportOverlayComponent);

  showExportOverlay = () =>
    this.overlayService.displayComponent(ExportOverlayComponent, { allocationData: this.allocationData });

  saveToPrompt = (): Promise<boolean> => this.workspaceStateService.saveToPrompt();

  flushWorkspaceNow = (): Promise<boolean> => this.workspaceStateService.saveWorkspaceNow();

  showSortConfirmation() {
    this.overlayService.displayComponent(ConfirmationOverlayComponent, {
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
    });
  }

  showDeleteConfirmation = () => {
    this.overlayService.displayComponent(ConfirmationOverlayComponent, {
      title: 'Delete',
      description:
        'Permanently erase all data, including students, allocations and constraints. This action cannot be undone.',
      primaryText: 'Delete',
      primaryButtonClass: 'btn-warn',
      primaryAction: () => {
        this.studentsService.deleteStudents();
        this.projectsService.deleteProjects();
        this.allocationsService.deleteAllocations();
        this.skillsService.deleteSkills();
        this.constraintsService.deleteConstraints();
        this.courseIterationsService.setCourseIteration();
        this.overlayService.closeOverlay();
      },
      secondaryText: 'Keep Data',
    });
  };

  private updateFulfillsAllConstraints(): void {
    this.fulfillsAllConstraints = this.allocationData.projectsData.every(p => p.fulfillsAllConstraints);
  }
}
