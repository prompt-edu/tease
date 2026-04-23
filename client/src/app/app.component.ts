import {
  Component,
  ComponentFactoryResolver,
  OnDestroy,
  OnInit,
  Type,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OverlayHostDirective } from './overlay-host.directive';
import { OverlayComponentData, OverlayData, OverlayService, OverlayServiceHost } from './overlay.service';
import { DragulaService } from 'ng2-dragula';
import { Allocation, CourseIteration, Project, Skill, Student } from 'src/app/api/models';
import { StudentsService } from 'src/app/shared/data/students.service';
import { AllocationsService } from 'src/app/shared/data/allocations.service';
import { ProjectsService } from 'src/app/shared/data/projects.service';
import { SkillsService } from 'src/app/shared/data/skills.service';
import { ConstraintsService } from 'src/app/shared/data/constraints.service';
import { Subscription } from 'rxjs';
import { ConstraintWrapper } from './shared/matching/constraints/constraint';
import { AllocationData } from './shared/models/allocation-data';
import { PromptService } from './shared/services/prompt.service';
import { CourseIterationsService } from './shared/data/course-iteration.service';
import { ConfirmationOverlayComponent } from './components/confirmation-overlay/confirmation-overlay.component';
import { ImportOverlayComponent } from './components/import-overlay/import-overlay.component';
import { LockedStudentsService } from './shared/data/locked-students.service';
import { AllocationDataService } from './shared/services/allocation-data.service';
import { CollaborationService } from './shared/services/collaboration.service';
import { UtilityComponent } from './components/utility/utility.component';
import { ResizeService } from './shared/services/resize.service';
import { PromptConnectionService } from './shared/services/prompt-connection.service';
import { WorkspaceStateService } from './shared/services/workspace-state.service';
import { ToastsService } from './shared/services/toasts.service';

type AppMode = 'loading' | 'picker' | 'workspace' | 'csv';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None, // This is needed to get the material icons to work. Angular bug?
  standalone: false,
})
export class AppComponent implements OverlayServiceHost, OnInit, OnDestroy {
  overlayVisible = false;
  dataLoaded = false;
  allocationData: AllocationData;

  /** Boot-time mode driving the top-level template switch. */
  mode: AppMode = 'loading';

  @ViewChild(OverlayHostDirective)
  private overlayHostDirective: OverlayHostDirective;
  @ViewChild('utilityRef')
  utilityComponent!: UtilityComponent;

  private subscriptions: Subscription[] = [];
  private students: Student[];
  private projects: Project[];
  private skills: Skill[];
  private allocations: Allocation[];
  private constraintWrappers: ConstraintWrapper[];

  constructor(
    public overlayService: OverlayService,
    private componentFactoryResolver: ComponentFactoryResolver,
    private dragulaService: DragulaService,
    private studentsService: StudentsService,
    private allocationsService: AllocationsService,
    private projectsService: ProjectsService,
    private skillsService: SkillsService,
    private constraintsService: ConstraintsService,
    private courseIterationsService: CourseIterationsService,
    private promptService: PromptService,
    private lockedStudentsService: LockedStudentsService,
    private allocationDataService: AllocationDataService,
    private collaborationService: CollaborationService,
    private resizeService: ResizeService,
    private promptConnectionService: PromptConnectionService,
    private workspaceStateService: WorkspaceStateService,
    private toastsService: ToastsService
  ) {
    this.overlayService.host = this;
  }

  ngOnInit(): void {
    this.dragulaService.createGroup('STUDENTS', {
      invalid: el => {
        return el.classList.contains('locked');
      },
    });

    this.subscriptions.push(
      this.dragulaService.drop('STUDENTS').subscribe(({ el, target, sibling }) => {
        this.handleStudentDrop(el, target, sibling);
      }),
      this.allocationsService.allocations$.subscribe(allocations => {
        this.allocations = allocations;
        this.updateAllocationData();
      }),
      this.studentsService.students$.subscribe(students => {
        this.students = students;
        this.updateAllocationData();
      }),
      this.projectsService.projects$.subscribe(projects => {
        this.projects = projects;
        this.updateAllocationData();
      }),
      this.skillsService.skills$.subscribe(skills => {
        this.skills = skills;
        this.updateAllocationData();
      }),
      this.constraintsService.constraints$.subscribe(constraintWrappers => {
        this.constraintWrappers = constraintWrappers;
        this.updateAllocationData();
      }),
      this.lockedStudentsService.locks$.subscribe(() => {
        this.updateAllocationData();
      })
    );

    document.documentElement.style.setProperty('--utility-height', `${256}px`);

    // Boot-time entry flow — see plan §6.2.
    //   1. ?coursePhaseId=<uuid> → skip picker, hydrate directly.
    //   2. PROMPT reachable → show project picker.
    //   3. Otherwise → existing CSV import flow unchanged.
    void this.initialiseEntryFlow();

    this.fetchCourseIterations();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription?.unsubscribe());
    this.resizeService.cleanup();
  }

  /* -------------------------------------------------------------- */
  /* Boot-time entry flow                                            */
  /* -------------------------------------------------------------- */

  private async initialiseEntryFlow(): Promise<void> {
    const coursePhaseId = this.readCoursePhaseIdFromUrl();

    // Always probe PROMPT so the header dropdown knows it can offer the
    // project switcher, even on the query-param path. Fire-and-forget
    // when a coursePhaseId is already in hand — we don't want to block
    // the launch flow waiting for probe results.
    if (coursePhaseId) {
      void this.promptConnectionService.probe();
      await this.hydrateFromCoursePhaseId(coursePhaseId);
      return;
    }

    const connected = await this.promptConnectionService.probe();
    if (connected) {
      this.mode = 'picker';
      return;
    }

    // No connection → fall through to the existing CSV import UI, which
    // is the default behaviour when `dataLoaded` is false.
    this.mode = 'csv';
  }

  private readCoursePhaseIdFromUrl(): string | null {
    if (typeof window === 'undefined' || !window.location) return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('coursePhaseId');
      return id && id.trim().length > 0 ? id : null;
    } catch {
      return null;
    }
  }

  /**
   * Invoked both on boot with `?coursePhaseId=` and from the project
   * picker. Pulls students/skills/projects/allocations from PROMPT,
   * then hydrates the workspace (constraints + locks + draft +
   * algorithm) via `WorkspaceStateService`.
   */
  private async hydrateFromCoursePhaseId(coursePhaseId: string): Promise<void> {
    this.mode = 'loading';
    try {
      const [students, projects, skills] = await Promise.all([
        this.promptService.getStudents(coursePhaseId),
        this.promptService.getProjects(coursePhaseId),
        this.promptService.getSkills(coursePhaseId),
      ]);

      this.studentsService.deleteStudents();
      this.projectsService.deleteProjects();
      this.skillsService.deleteSkills();

      this.studentsService.setStudents(students ?? []);
      this.projectsService.setProjects(projects ?? []);
      this.skillsService.setSkills(skills ?? []);

      // Mirror the selected course phase into the existing
      // CourseIterationsService *before* hydrating workspace state — the
      // constraints/locks/allocations services route WebSocket updates
      // through CourseIterationsService.getCourseIteration(), so if the
      // course phase is set afterwards, hydration emissions during a
      // phase switch would be attributed to the previously-selected
      // phase id.
      const courseIteration: CourseIteration = {
        id: coursePhaseId,
        semesterName: this.resolveSemesterName(coursePhaseId),
      };
      this.courseIterationsService.setCourseIteration(courseIteration);

      // Fetch & apply the persisted workspace (constraints, locks,
      // draft allocations, algorithm type).
      await this.workspaceStateService.hydrate(coursePhaseId);

      try {
        await this.collaborationService.connect(coursePhaseId);
      } catch (err) {
        console.warn('WebSocket collaboration connect failed; continuing', err);
      }

      this.mode = 'workspace';
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        this.toastsService.showToast(
          `Error ${error.status}: ${error.statusText}`,
          'Hydrate failed',
          false
        );
      } else {
        this.toastsService.showToast('Could not load course phase from PROMPT.', 'Hydrate failed', false);
      }
      // Fall back to CSV if hydration fails, matching the plan's
      // precedence rule (CSV is always the safe fallback).
      this.mode = 'csv';
    }
  }

  /**
   * Best-effort lookup of a human readable semester name from the
   * cached course-phase list. Returns undefined if the cache hasn't
   * been populated yet or the id isn't present.
   */
  private resolveSemesterName(coursePhaseId: string): string | undefined {
    return this.promptConnectionService.findCoursePhase(coursePhaseId)?.semesterName;
  }

  /** Called by `<app-project-picker (coursePhaseSelected)="...">`. */
  async onCoursePhaseSelected(phase: CourseIteration): Promise<void> {
    if (!phase?.id) return;

    // Reflect the selection in the URL so reloads stay on the same
    // course phase (Workflow B parity).
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('coursePhaseId', phase.id);
      window.history.replaceState({}, '', url);
    } catch {
      // Non-fatal — continue without URL mutation.
    }

    await this.hydrateFromCoursePhaseId(phase.id);
  }

  private handleStudentDrop(el: Element, target: Element, sibling: Element): void {
    if (!el || !target) return;
    const studentId = el.children[0].id;
    const projectId = target.id;
    const siblingId = sibling?.children[0].id;

    if (!studentId) return;

    if (!projectId) {
      this.allocationsService.removeStudentFromAllocations(studentId);
      return;
    }

    this.allocationsService.moveStudentToProjectAtPosition(studentId, projectId, siblingId);
  }

  /* OverlayServiceHost interface */
  public displayComponent(component: Type<OverlayComponentData>, data: OverlayData) {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    const viewContainerRef = this.overlayHostDirective.viewContainerRef;
    viewContainerRef.clear();
    const componentRef = viewContainerRef.createComponent(componentFactory);
    (componentRef.instance as OverlayComponentData).data = data;
    this.overlayVisible = true;
  }

  public closeOverlay() {
    this.overlayVisible = false;
    this.overlayHostDirective.viewContainerRef.clear();
  }

  private updateAllocationData() {
    const allocationData = this.allocationDataService.getAllocationData(
      this.projects,
      this.students,
      this.allocations,
      this.constraintWrappers,
      this.skills
    );

    if (!allocationData) {
      return;
    }
    this.allocationData = allocationData;
    this.dataLoaded = true;
  }

  private async fetchCourseIterations() {
    const courseIteration = this.courseIterationsService.getCourseIteration();
    if (!courseIteration || !this.promptService.isImportPossible()) {
      return;
    }
    // Share the probe's inflight/cached list instead of issuing a duplicate
    // GET /tease/course-phases round-trip.
    const courseIterations = await this.promptConnectionService.listCoursePhases();
    if (!courseIterations.length) {
      return;
    }

    const courseIterationDate = new Date(courseIteration.kickoffSubmissionPeriodEnd);

    let newCourseIterationAvailable = false;
    courseIterations.forEach(async courseIteration => {
      const courseIterationDateToCompare = new Date(courseIteration.kickoffSubmissionPeriodEnd);
      if (courseIterationDateToCompare > courseIterationDate) {
        newCourseIterationAvailable = true;
      }
    });

    if (newCourseIterationAvailable) {
      this.showImportOverlay();
    }
  }

  private showImportOverlay() {
    const overlayData = {
      description:
        'You are currently working on an outdated course iteration. Do you want to import the new course iteration?',
      title: 'New Course Iteration Available',
      primaryText: 'Open Import',
      primaryButtonClass: 'btn-primary',
      primaryAction: () => this.overlayService.switchComponent(ImportOverlayComponent),
    };

    this.overlayService.displayComponent(ConfirmationOverlayComponent, overlayData);
  }

  startResize(event: MouseEvent): void {
    if (!this.utilityComponent?.utilityContainerVisible) {
      return;
    }

    this.resizeService.startResize(event);
  }
}
