import { Component, OnDestroy, OnInit } from '@angular/core';
import { Project } from 'src/app/api/models';
import { OverlayComponentData, OverlayService } from 'src/app/overlay.service';
import { ConstraintsService } from 'src/app/shared/data/constraints.service';
import { ProjectsService } from 'src/app/shared/data/projects.service';
import { ConstraintWrapper } from 'src/app/shared/matching/constraints/constraint';
import {
  facAddIcon,
  facCheckExtraBoldIcon,
  facDeleteIcon,
  facEditIcon,
  facFlagIcon,
  facGroupsIcon,
  facMoreIcon,
  facMoreExtraBoldIcon,
  facToggleOnIcon,
  facWarnIcon,
} from 'src/assets/icons/icons';
import { ConstraintBuilderOverlayComponent } from '../constraint-builder-overlay/constraint-builder-overlay.component';
import { LockedStudentsService } from 'src/app/shared/data/locked-students.service';
import { StudentsService } from 'src/app/shared/data/students.service';
import { AllocationsService } from 'src/app/shared/data/allocations.service';
import { ToastsService } from 'src/app/shared/services/toasts.service';
import { StudentSortService } from 'src/app/shared/services/student-sort.service';
import { ConstraintBuilderNationalityComponent } from '../constraint-builder-nationality/constraint-builder-nationality.component';
import { Subscription } from 'rxjs';
import { MatchingMode, MatchingRouterService } from 'src/app/shared/matching/matching-router.service';import { CourseIterationsService } from 'src/app/shared/data/course-iteration.service';

@Component({
  selector: 'app-constraint-summary',
  templateUrl: './constraint-summary.component.html',
  styleUrl: './constraint-summary.component.scss',
  standalone: false,
})
export class ConstraintSummaryComponent implements OverlayComponentData, OnInit, OnDestroy {
  data = null;
  facDeleteIcon = facDeleteIcon;
  facGroupsIcon = facGroupsIcon;
  facAddIcon = facAddIcon;
  facEditIcon = facEditIcon;
  facFlagIcon = facFlagIcon;
  facMoreIcon = facMoreIcon;
  facMoreExtraBoldIcon = facMoreExtraBoldIcon;
  facCheckExtraBoldIcon = facCheckExtraBoldIcon;
  facToggleOnIcon = facToggleOnIcon;
  facWarnIcon = facWarnIcon;

  constraintWrappers: ConstraintWrapper[] = [];
  projects: Project[] = [];
  matchingMode: MatchingMode;

  private subscription: Subscription;

  constructor(
    private overlayService: OverlayService,
    private constraintsService: ConstraintsService,
    private projectsService: ProjectsService,
    private studentsService: StudentsService,
    private lockedStudentsService: LockedStudentsService,
    private matchingRouterService: MatchingRouterService,
    private courseIterationsService: CourseIterationsService,
    private allocationsService: AllocationsService,
    private toastsService: ToastsService,
    private studentSortService: StudentSortService
  ) {}

  ngOnInit(): void {
    this.subscription = this.constraintsService.constraints$.subscribe(constraintWrappers => {
      this.constraintWrappers = constraintWrappers;
    });
    this.projects = this.projectsService.getProjects();
    this.matchingMode = this.matchingRouterService.getMatchingMode({
      students: this.studentsService.getStudents(),
      projects: this.projects,
      constraintWrappers: this.constraintWrappers,
      locks: this.lockedStudentsService.getLocks(),
      courseIteration: this.courseIterationsService.getCourseIteration(),
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  showConstraintNationalityBuilderOverlay(): void {
    this.overlayService.switchComponent(ConstraintBuilderNationalityComponent);
  }

  showConstraintBuilderOverlay(constraintWrapper: ConstraintWrapper): void {
    const overlayData = {
      constraintWrapper: constraintWrapper,
      onClosed: () => {
        this.overlayService.switchComponent(ConstraintSummaryComponent);
      },
    };

    this.overlayService.switchComponent(ConstraintBuilderOverlayComponent, overlayData);
  }

  cancel(): void {
    this.overlayService.closeOverlay();
  }

  deleteConstraintWrapper(id: string): void {
    this.constraintsService.deleteConstraint(id);
    this.constraintWrappers = this.constraintsService.getConstraints();
  }

  async distributeTeams(): Promise<void> {
    const locks = this.lockedStudentsService.getLocks();
    const students = this.studentsService.getStudents();
    const allocations = await this.matchingRouterService.getAllocations({
      students,
      projects: this.projects,
      constraintWrappers: this.constraintWrappers,
      locks,
      courseIteration: this.courseIterationsService.getCourseIteration(),
    });
    if (allocations) {
      this.allocationsService.setAllocations(this.studentSortService.sortStudentsInAllocations(students, allocations));
      this.cancel();
      this.toastsService.showToast('Distribution Complete', 'Success', true);
    }
  }

  setActive(id: string, active: boolean): void {
    this.constraintsService.setActive(id, active);
    this.constraintWrappers = this.constraintsService.getConstraints();
  }

  get isCompanyGreedyMode(): boolean {
    return this.matchingMode === 'company-greedy';
  }
}
