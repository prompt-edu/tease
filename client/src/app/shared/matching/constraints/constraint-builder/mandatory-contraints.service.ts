import { Injectable } from '@angular/core';
import { IdMappingService } from '../../../data/id-mapping.service';
import { Student } from 'src/app/api/models';

@Injectable({
  providedIn: 'root',
})
export class MandatoryConstraintsService {
  constructor(private constraintMappingService: IdMappingService) {}

  createConstraints(students: Student[], projectIds: string[]): string[] {
    const studentNumericalIds = students.map(student => this.constraintMappingService.getNumericalId(student.id));
    const projectNumericalIds = projectIds.map(projectId => this.constraintMappingService.getNumericalId(projectId));

    const constraints = this.createIntegerConstraints(studentNumericalIds, projectNumericalIds);
    constraints.push(...this.createOneStudentConstraint(studentNumericalIds, projectNumericalIds));

    return constraints;
  }

  private createIntegerConstraints(studentNumericalIds: string[], projectNumericalIds: string[]): string[] {
    return studentNumericalIds.flatMap(studentNumericalId => {
      return projectNumericalIds.map(projectNumericalId => {
        return `int x${studentNumericalId}y${projectNumericalId}`;
      });
    });
  }

  private createOneStudentConstraint(studentNumericalIds: string[], projectNumericalIds: string[]): string[] {
    return studentNumericalIds.map(studentNumericalId => {
      return (
        projectNumericalIds
          .map(projectNumericalId => {
            return `x${studentNumericalId}y${projectNumericalId}`;
          })
          .join(' + ') + ' = 1'
      );
    });
  }
}
