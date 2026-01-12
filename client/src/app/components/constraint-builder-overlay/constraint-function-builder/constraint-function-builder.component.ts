import { Component, EventEmitter, OnDestroy, OnInit, Output, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Skill, Student } from 'src/app/api/models';
import { SkillsService } from 'src/app/shared/data/skills.service';
import { StudentsService } from 'src/app/shared/data/students.service';
import { ConstraintFunctionWrapper } from 'src/app/shared/matching/constraints/constraint';
import {
  ConstraintFunction,
  ConstraintFunctionValues,
  SelectData,
} from 'src/app/shared/matching/constraints/constraint-functions/constraint-function';
import { DeviceConstraintFunction } from 'src/app/shared/matching/constraints/constraint-functions/device-constraint-function';
import { GenderConstraintFunction } from 'src/app/shared/matching/constraints/constraint-functions/gender-connstraint-function';
import { IntroCourseProficiencyConstraintFunction } from 'src/app/shared/matching/constraints/constraint-functions/intro-course-proficiency-constraint-function';
import { LanguageProficiencyConstraintFunction } from 'src/app/shared/matching/constraints/constraint-functions/language-proficiency-constraint-function';
import { NationalityConstraintFunction } from 'src/app/shared/matching/constraints/constraint-functions/nationality-constraint-function';
import { SkillConstraintFunction } from 'src/app/shared/matching/constraints/constraint-functions/skill-constraint-function';
import { TeamSizeConstraintFunction } from 'src/app/shared/matching/constraints/constraint-functions/team-size-constraint-function';

@Component({
  selector: 'app-constraint-function-builder',
  templateUrl: './constraint-function-builder.component.html',
  styleUrl: './constraint-function-builder.component.scss',
  standalone: false,
})
export class ConstraintFunctionBuilderComponent implements OnInit, OnDestroy {
  private students: Student[] = [];
  private skills: Skill[] = [];
  private constraintFunctions: ConstraintFunction[] = [];
  private constraintFunctionData: ConstraintFunctionValues[] = [];
  @Output() constraintFunctionChange = new EventEmitter<ConstraintFunctionWrapper>();
  @Input() constraintFunctionWrapper: ConstraintFunctionWrapper;

  form: FormGroup;
  propertyData: SelectData[];
  operatorData: SelectData[];
  valueData: SelectData[];
  filteredStudentCount: number;
  showOperatorData = false;
  showValueData = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private studentsService: StudentsService,
    private skillsService: SkillsService
  ) {}

  ngOnInit(): void {
    this.students = this.studentsService.getStudents();
    this.skills = this.skillsService.getSkills();

    this.constraintFunctions = [
      new GenderConstraintFunction(this.students, this.skills),
      new SkillConstraintFunction(this.students, this.skills),
      new DeviceConstraintFunction(this.students, this.skills),
      new TeamSizeConstraintFunction(this.students, this.skills),
      new IntroCourseProficiencyConstraintFunction(this.students, this.skills),
      new LanguageProficiencyConstraintFunction(this.students, this.skills),
      new NationalityConstraintFunction(this.students, this.skills),
    ];

    this.constraintFunctionData = this.constraintFunctions.flatMap(constraintFunction =>
      constraintFunction.getConstraintFunctionFormData()
    );

    this.form = new FormGroup({
      property: new FormControl<string>(null, Validators.required),
      operator: new FormControl<string>(null, Validators.required),
      value: new FormControl<string>(null, Validators.required),
    });

    this.subscriptions.push(
      this.form.get('property').valueChanges.subscribe(() => {
        this.updateOperatorsAndValues();
        this.updateStudents();
      }),
      this.form.get('operator').valueChanges.subscribe(() => {
        this.updateStudents();
      }),
      this.form.get('value').valueChanges.subscribe(() => {
        this.updateStudents();
      })
    );

    this.createPropertySelectGroup();

    if (
      this.constraintFunctionWrapper.propertyId &&
      this.constraintFunctionWrapper.operator &&
      this.constraintFunctionWrapper.valueId
    ) {
      this.form.get('property').setValue(this.constraintFunctionWrapper.propertyId);
      this.form.get('operator').setValue(this.constraintFunctionWrapper.operator);
      this.form.get('value').setValue(this.constraintFunctionWrapper.valueId);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription?.unsubscribe());
  }

  createPropertySelectGroup(): void {
    this.propertyData = this.constraintFunctionData.flatMap(formData => {
      return { name: formData.property.name, id: formData.property.id, group: formData.name };
    });
    this.form.get('property').setValue(this.propertyData[0].id);
    this.updateOperatorsAndValues();
  }

  updateOperatorsAndValues(): void {
    const constraintFunctionValue = this.getConstraintFunctionValue();
    this.updateOperators(constraintFunctionValue.operators);
    this.updateValues(constraintFunctionValue.values);
  }

  updateOperators(operatorData: SelectData[]): void {
    this.operatorData = operatorData;
    this.form.get('operator').setValue(operatorData[0].id);
    if (operatorData.length < 2) {
      this.showOperatorData = false;
    } else {
      this.showOperatorData = true;
    }
  }

  updateValues(valueData: SelectData[]): void {
    this.valueData = valueData;
    this.form.get('value').setValue(valueData[0].id);
    if (valueData.length < 2) {
      this.showValueData = false;
    } else {
      this.showValueData = true;
    }
  }

  updateStudents(): void {
    if (!this.form.valid) {
      return;
    }

    const propertyId = this.form.get('property').value;
    const property = this.constraintFunctionData.find(data => data.property.id === propertyId).property;
    const operator = this.form.get('operator').value;
    const valueId = this.form.get('value').value;
    const values = this.constraintFunctionData.flatMap(data => data.values);
    const value = values.find(value => value.id === valueId);
    const constraintFunction = this.getConstraintFunctionValue().constraintFunction;
    const filteredStudentIds = constraintFunction
      .filterStudentsByConstraintFunction(propertyId, operator, valueId)
      .map(student => student.id);
    this.filteredStudentCount = filteredStudentIds.length;

    this.constraintFunctionChange.emit({
      property: property.name,
      propertyId: propertyId,
      operator: operator,
      value: value.name,
      valueId: valueId,
      studentIds: filteredStudentIds,
      description: constraintFunction.getDescription(property.name, operator, value.name),
    });
  }

  private getConstraintFunctionValue(): ConstraintFunctionValues {
    const propertyId = this.form.get('property').value;
    return this.constraintFunctionData.find(data => data.property.id === propertyId);
  }
}
