import { Component, OnInit, ViewChild } from '@angular/core';
import { OverlayComponentData, OverlayService } from 'src/app/overlay.service';
import { ConstraintsService } from 'src/app/shared/data/constraints.service';
import { ProjectsService } from 'src/app/shared/data/projects.service';
import { StudentsService } from 'src/app/shared/data/students.service';
import { SelectData } from 'src/app/shared/matching/constraints/constraint-functions/constraint-function';
import { NationalityConstraintFunction } from 'src/app/shared/matching/constraints/constraint-functions/nationality-constraint-function';
import { ConstraintSummaryComponent } from '../constraint-summary-view/constraint-summary.component';
import { Operator } from 'src/app/shared/matching/constraints/constraint-utils';
import {
  ConstraintFunctionWrapper,
  ConstraintWrapper,
  ThresholdWrapper,
} from 'src/app/shared/matching/constraints/constraint';
import { v4 as uuid } from 'uuid';
import { facMoreIcon } from 'src/assets/icons/icons';
import { SelectComponent } from '../select/select.component';

@Component({
  selector: 'app-constraint-builder-nationality',
  templateUrl: './constraint-builder-nationality.component.html',
  styleUrl: './constraint-builder-nationality.component.scss',
  standalone: false,
})
export class ConstraintBuilderNationalityComponent implements OverlayComponentData, OnInit {
  facMoreIcon = facMoreIcon;

  data = null;
  projectsSelectData: SelectData[] = [];
  selectedProjectIds: string[] = [];
  nationalitiesSelectData: SelectData[] = [];
  selectedNationalityIds: string[] = [];

  constraintFunction: NationalityConstraintFunction;

  isFormValid = false;

  // "Staatenliste im Sinne von § 13 Abs. 1 Nr. 17 SÜG" accessed on 30.04.2024
  readonly STAATENLISTE = [
    'AF',
    'DZ',
    'AM',
    'AZ',
    'BY',
    'CN',
    'GE',
    'IQ',
    'IR',
    'KZ',
    'KG',
    'KP',
    'CU',
    'LA',
    'LB',
    'LY',
    'MD',
    'PK',
    'RU',
    'SD',
    'SY',
    'TJ',
    'TM',
    'UA',
    'UZ',
    'VN',
  ];

  @ViewChild('nationalitySelect') nationalitySelect: SelectComponent;

  constructor(
    private constraintsService: ConstraintsService,
    private studentsService: StudentsService,
    private projectsService: ProjectsService,
    private overlayService: OverlayService
  ) {}

  ngOnInit(): void {
    const students = this.studentsService.getStudents();
    this.constraintFunction = new NationalityConstraintFunction(students, []);
    this.nationalitiesSelectData = this.constraintFunction.getValues();
    this.projectsSelectData = this.projectsService.getProjects().map(project => ({
      id: project.id,
      name: project.name,
    }));
    this.projectsService.getProjects().forEach(project => {
      this.projectsSelectData.find(p => p.id === project.id).selected = true;
    });
  }
  close(): void {
    this.overlayService.switchComponent(ConstraintSummaryComponent);
  }

  save(): void {
    const thresholdWrapper = this.getThresholdWrapper();

    this.nationalitiesSelectData.forEach(nationality => {
      if (!nationality.selected) {
        return;
      }
      const constraintFunctionWrapper = this.getConstraintFunctionWrapper(nationality);
      const constraint: ConstraintWrapper = {
        projectIds: this.selectedProjectIds,
        constraintFunction: constraintFunctionWrapper,
        threshold: thresholdWrapper,
        id: uuid(),
        isActive: true,
      };
      this.constraintsService.addConstraint(constraint);
    });

    this.close();
  }

  private getConstraintFunctionWrapper(nationality: SelectData): ConstraintFunctionWrapper {
    const property = this.constraintFunction.getProperties().values[0];
    const operator = Operator.EQUALS;
    const filteredStudentIds = this.constraintFunction
      .filterStudentsByConstraintFunction(null, Operator.EQUALS, nationality.id)
      .map(student => student.id);

    return {
      property: property.name,
      propertyId: property.id,
      operator: operator,
      value: nationality.name,
      valueId: nationality.id,
      studentIds: filteredStudentIds,
      description: this.constraintFunction.getDescription(property.name, operator, nationality.name),
    };
  }

  private getThresholdWrapper(): ThresholdWrapper {
    return {
      lowerBound: 0,
      upperBound: 0,
    };
  }

  selectFromStaatenliste(): void {
    this.selectedNationalityIds = [];
    this.nationalitiesSelectData.forEach(nationality => {
      if (this.STAATENLISTE.includes(nationality.id)) {
        this.selectedNationalityIds.push(nationality.id);
        nationality.selected = true;
        return;
      }
      nationality.selected = false;
    });
    this.nationalitySelect.updateAllSelected();
    this.updateFormValid();
  }

  projectsSelectionChange(projectIds: string[]): void {
    this.selectedProjectIds = projectIds;
    this.updateFormValid();
  }

  nationalitiesSelectionChange(nationalityIds: string[]): void {
    this.selectedNationalityIds = nationalityIds;
    this.updateFormValid();
  }

  updateFormValid(): void {
    if (this.selectedProjectIds.length && this.selectedNationalityIds.length) {
      this.isFormValid = true;
      return;
    }
    this.isFormValid = false;
  }
}
