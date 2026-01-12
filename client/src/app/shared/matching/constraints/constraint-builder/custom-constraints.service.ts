import { Injectable } from '@angular/core';
import { IdMappingService } from '../../../data/id-mapping.service';
import { ConstraintWrapper } from '../constraint';
import { Operator } from '../constraint-utils';

@Injectable({
  providedIn: 'root',
})
export class CustomConstraintsService {
  constructor(private constraintMappingService: IdMappingService) {}

  createConstraints(constraintWrappers: ConstraintWrapper[]): string[] {
    return constraintWrappers.flatMap(constraintWrapper =>
      this.createConstraintForConstraintWrapper(constraintWrapper)
    );
  }

  private createConstraintForConstraintWrapper(constraintWrapper: ConstraintWrapper): string[] {
    const projectIds = constraintWrapper.projectIds;
    const constraints: string[] = [];
    const studentIds = constraintWrapper.constraintFunction.studentIds;
    const lowerBound = constraintWrapper.threshold.lowerBound;
    const upperBound = constraintWrapper.threshold.upperBound;

    projectIds.forEach(projectId => {
      constraints.push(
        this.createConstraintForProjectIdAndBound(projectId, studentIds, Operator.GREATER_THAN_OR_EQUAL, lowerBound)
      );
      constraints.push(
        this.createConstraintForProjectIdAndBound(projectId, studentIds, Operator.LESS_THAN_OR_EQUAL, upperBound)
      );
    });

    return constraints;
  }

  private createConstraintForProjectIdAndBound(
    projectId: string,
    studentIds: string[],
    operator: Operator,
    threshold: number
  ): string {
    const constraintMappingService = this.constraintMappingService;
    const studentProjectPairs = studentIds.map(studentId => {
      const numericalStudentId = constraintMappingService.getNumericalId(studentId);
      const projectIdNumber = constraintMappingService.getNumericalId(projectId);
      return `x${numericalStudentId}y${projectIdNumber}`;
    });
    return `${studentProjectPairs.join(' + ')} ${operator} ${threshold}`;
  }
}
