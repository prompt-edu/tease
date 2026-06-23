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
  encapsulation: ViewEncapsulation.None, // material icons rely on global styles
  standalone: false,
})
export class AppComponent implements OverlayServiceHost, OnInit, OnDestroy {
  overlayVisible = false;
  dataLoaded = false;
  allocationData: AllocationData;
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
      invalid: el => el.classList.contains('locked'),
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
      })
    );

    document.documentElement.style.setProperty('--utility-height', `${256}px`);

    void this.initialiseEntryFlow();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription?.unsubscribe());
    this.resizeService.cleanup();
  }

  /**
   * Boot entry flow:
   *   1. `?coursePhaseId=<uuid>` → skip picker, hydrate directly.
   *   2. PROMPT reachable → show project picker.
   *   3. Otherwise → CSV import flow (default when `dataLoaded` is false).
   */
  private async initialiseEntryFlow(): Promise<void> {
    const coursePhaseId = this.readCoursePhaseIdFromUrl();
    const connected = await this.promptConnectionService.probe();

    if (coursePhaseId && connected) {
      const phase = this.promptConnectionService.findCoursePhase(coursePhaseId) ?? { id: coursePhaseId };
      await this.hydrate(phase);
      return;
    }
    this.mode = connected ? 'picker' : 'csv';
  }

  private readCoursePhaseIdFromUrl(): string | null {
    const id = new URLSearchParams(window.location.search).get('coursePhaseId');
    return id?.trim() || null;
  }

  /**
   * Pull students/skills/projects from PROMPT, then load the persisted
   * workspace (constraints, locks, draft allocations) via WorkspaceStateService.
   */
  private async hydrate(phase: CourseIteration): Promise<void> {
    this.mode = 'loading';
    try {
      const [students, projects, skills] = await Promise.all([
        this.promptService.getStudents(phase.id),
        this.promptService.getProjects(phase.id),
        this.promptService.getSkills(phase.id),
      ]);

      this.studentsService.setStudents(students ?? []);
      this.projectsService.setProjects(projects ?? []);
      this.skillsService.setSkills(skills ?? []);

      // Set the course phase BEFORE workspace hydration — locks/constraints/
      // allocations services key WebSocket broadcasts off it.
      this.courseIterationsService.setCourseIteration(phase);

      await this.workspaceStateService.hydrate(phase.id);

      try {
        await this.collaborationService.connect(phase.id);
      } catch (err) {
        console.warn('WebSocket collaboration connect failed; continuing', err);
      }

      this.mode = 'workspace';
    } catch (error) {
      const message =
        error instanceof HttpErrorResponse
          ? `Error ${error.status}: ${error.statusText}`
          : 'Could not load course phase from PROMPT.';
      this.toastsService.showToast(message, 'Hydrate failed', false);
      this.mode = 'csv';
    }
  }

  /** Called by `<app-project-picker (coursePhaseSelected)="...">`. */
  async onCoursePhaseSelected(phase: CourseIteration): Promise<void> {
    if (!phase?.id) return;
    const url = new URL(window.location.href);
    url.searchParams.set('coursePhaseId', phase.id);
    window.history.replaceState({}, '', url);
    await this.hydrate(phase);
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

    if (!allocationData) return;
    this.allocationData = allocationData;
    this.dataLoaded = true;
  }

  startResize(event: MouseEvent): void {
    if (!this.utilityComponent?.utilityContainerVisible) return;
    this.resizeService.startResize(event);
  }
}
