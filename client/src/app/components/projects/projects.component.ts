import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { facCheckIcon, facErrorIcon, facInfoIcon, facWarnIcon } from 'src/assets/icons/icons';
import { ProjectData } from 'src/app/shared/models/allocation-data';
import { LockedStudentsService } from 'src/app/shared/data/locked-students.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
  standalone: false,
})
export class ProjectsComponent implements OnInit, OnDestroy {
  facErrorIcon = facErrorIcon;
  facCheckIcon = facCheckIcon;
  facInfoIcon = facInfoIcon;
  facWarnIcon = facWarnIcon;

  @Input({ required: true }) projectsData: ProjectData[];
  @Input() imageExport: boolean = false;
  constraintsVisible = false;

  lockedStudents: string[] = [];
  private locksSubscription: Subscription;

  constructor(private lockedStudentsService: LockedStudentsService) {}

  ngOnInit() {
    this.locksSubscription = this.lockedStudentsService.locks$.subscribe(locks => {
      this.lockedStudents = Array.from(locks.keys());
    });
  }

  ngOnDestroy() {
    this.locksSubscription?.unsubscribe();
  }
}
