import { CourseIteration, Project, Student } from 'src/app/api/models';
import { ConstraintWrapper } from '../matching/constraints/constraint';

export interface ProjectData {
  project: Project;
  projectConstraints: ProjectConstraint[];
  fulfillsAllConstraints: boolean;
  students: Student[];
}

export interface ProjectConstraint {
  constraintWrapper: ConstraintWrapper;
  numberOfStudents: number;
}

export interface AllocationData {
  studentsWithoutTeam: Student[];
  projectsData: ProjectData[];
  courseIteration?: CourseIteration;
}

// export interface ProjectError {
//   error: boolean;
//   info: string;
// }
