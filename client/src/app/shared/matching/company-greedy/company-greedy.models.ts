import { Allocation, Project, Student } from 'src/app/api/models';
import { StudentIdToProjectIdMapping } from '../../data/locked-students.service';
import { ConstraintWrapper } from '../constraints/constraint';

export type CompanyGreedyStudent = Student & {
  preferredProjectTypes?: string[];
  registeredBefore?: boolean;
  previousParticipation?: boolean;
  blacklisted?: boolean;
  registeredIn?: string;
};

export type CompanyGreedyProject = Project & {
  projectType?: string;
  preferredStudyPrograms?: string[];
  capacity?: number;
};

export interface CompanyGreedyMatchingInput {
  students: CompanyGreedyStudent[];
  projects: CompanyGreedyProject[];
  constraintWrappers: ConstraintWrapper[];
  locks: StudentIdToProjectIdMapping;
  activeSemester: string;
}

export type CompanyGreedyMatchingResult = Allocation[];
