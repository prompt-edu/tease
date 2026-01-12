import { Injectable } from '@angular/core';
import { Student } from 'src/app/api/models';
import { ConstraintWrapper } from '../constraint';
import { MandatoryConstraintsService } from './mandatory-contraints.service';
import { CustomConstraintsService } from './custom-constraints.service';
import { CostFunctionsService } from './cost-functions.service';
import { LockedConstraintsService } from './locked-constraints.service';
import { StudentIdToProjectIdMapping } from 'src/app/shared/data/locked-students.service';

@Injectable({
  providedIn: 'root',
})
export class ConstraintBuilderService {
  constructor(
    private mandatoryConstraintsServce: MandatoryConstraintsService,
    private customConstraintsService: CustomConstraintsService,
    private costFunctionsService: CostFunctionsService,
    private lockedConstraintsService: LockedConstraintsService
  ) {}

  /**
   * Creates a list of constraints for the linear program based on the provided students, projects, custom constraints, and locks.
   * The constraints generated follow the format:
   * `x[numericalId of student]y[numericalId of project] + x[numericalId of student]y[numericalId of project] + ... <= [threshold]`.
   *
   * @param {Student[]} students - An array of `Student` objects for whom the constraints are being generated.
   * @param {string[]} projectIds - An array of project IDs that the students can be assigned to.
   * @param {ConstraintWrapper[]} constraintWrappers - An array of custom constraints that need to be applied.
   * @param {StudentIdToProjectIdMapping} locks - A mapping of locked student-to-project assignments.
   * @returns {string[]} - An array of constraint strings, each following the specified format.
   */
  createConstraints(
    students: Student[],
    projectIds: string[],
    constraintWrappers: ConstraintWrapper[],
    locks: StudentIdToProjectIdMapping
  ): string[] {
    const constraints: string[] = this.mandatoryConstraintsServce.createConstraints(students, projectIds);
    constraints.push(...this.customConstraintsService.createConstraints(constraintWrappers));
    constraints.push(this.costFunctionsService.createCostFunction(students));
    constraints.push(...this.lockedConstraintsService.createConstraints(locks));

    return constraints;
  }
}
