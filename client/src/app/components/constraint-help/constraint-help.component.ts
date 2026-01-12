import { Component } from '@angular/core';
import { OverlayComponentData, OverlayService } from 'src/app/overlay.service';
import { ConstraintWrapper } from 'src/app/shared/matching/constraints/constraint';
import { facCloseIcon, facPersonThinIcon } from 'src/assets/icons/icons';
import { ConstraintBuilderOverlayComponent } from '../constraint-builder-overlay/constraint-builder-overlay.component';
import { SelectData } from 'src/app/shared/matching/constraints/constraint-functions/constraint-function';

interface ProjectExample {
  valid: boolean;
  name: string;
  students: boolean[]; // true if student fulfills the constraint
}

interface DistributionExample {
  projects: ProjectExample[];
  name: string;
  valid: boolean;
}

@Component({
  selector: 'app-constraint-help',
  templateUrl: './constraint-help.component.html',
  styleUrl: './constraint-help.component.scss',
  standalone: false,
})
export class ConstraintHelpComponent implements OverlayComponentData {
  data: {
    constraintWrapper: ConstraintWrapper;
    onClosed: () => void;
  };
  facCloseIcon = facCloseIcon;
  facPersonThinIcon = facPersonThinIcon;

  projectsSelectData: SelectData[] = [
    { id: '1', name: 'Project A', selected: true },
    { id: '2', name: 'Project B', selected: true },
    { id: '3', name: 'Project C' },
  ];

  distributionExamples: DistributionExample[] = [
    {
      name: 'I.',
      valid: true,
      projects: [
        { name: 'Project A', valid: true, students: [true, true, true, false, false] },
        { name: 'Project B', valid: true, students: [true, true, false, false, false] },
        { name: 'Project C', valid: true, students: [false, false, false, false, false] },
      ],
    },
    {
      name: 'II.',
      valid: true,
      projects: [
        { name: 'Project A', valid: true, students: [true, false, false, false, false] },
        { name: 'Project B', valid: true, students: [true, false, false, false, false] },
        { name: 'Project C', valid: true, students: [true, true, true, false, false] },
      ],
    },
    {
      name: 'III.',
      valid: false,
      projects: [
        { name: 'Project A', valid: false, students: [false, false, false, false, false] },
        { name: 'Project B', valid: true, students: [true, true, true, false, false] },
        { name: 'Project C', valid: true, students: [true, true, false, false, false] },
      ],
    },
    {
      name: 'IV.',
      valid: false,
      projects: [
        { name: 'Project A', valid: true, students: [true, false, false, false, false] },
        { name: 'Project B', valid: false, students: [true, true, true, true, false] },
        { name: 'Project C', valid: true, students: [false, false, false, false, false] },
      ],
    },
  ];

  studentsData = [false, false, true, true, true, false, true, false, true]; // true if student fulfills the constraint

  constructor(private overlayService: OverlayService) {}

  close(): void {
    this.overlayService.switchComponent(ConstraintBuilderOverlayComponent, {
      constraintWrapper: this.data.constraintWrapper,
      onClosed: this.data.onClosed,
    });
  }
}
