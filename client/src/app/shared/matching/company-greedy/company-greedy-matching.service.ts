import { Injectable } from '@angular/core';
import { Allocation } from 'src/app/api/models';
import {
  CompanyGreedyMatchingInput,
  CompanyGreedyMatchingResult,
  CompanyGreedyProject,
  CompanyGreedyStudent,
} from './company-greedy.models';
import { ConstraintWrapper } from '../constraints/constraint';

@Injectable({
  providedIn: 'root',
})
export class CompanyGreedyMatchingService {
  private readonly NATIONALITY_CONSTRAINT_PROPERTY_ID = 'cf-nationality';

  getAllocations(input: CompanyGreedyMatchingInput): CompanyGreedyMatchingResult {
    const eligibleStudents = this.shuffleStudents(this.getEligibleStudents(input));
    const allocations = this.initializeAllocations(input.projects);
    const assignedStudentIds = new Set<string>();

    this.applyLocks(input, eligibleStudents, allocations, assignedStudentIds);
    this.fillPrimarySlots(input.projects, eligibleStudents, allocations, assignedStudentIds, input.constraintWrappers);
    this.fillRemainingCapacity(
      input.projects,
      eligibleStudents,
      allocations,
      assignedStudentIds,
      input.constraintWrappers
    );

    return allocations;
  }

  private getEligibleStudents(input: CompanyGreedyMatchingInput): CompanyGreedyStudent[] {
    return input.students.filter(student => {
      const isActiveSemester =
        !input.activeSemester || !student.registeredIn || student.registeredIn === input.activeSemester;
      return !student.blacklisted && !student.previousParticipation && isActiveSemester;
    });
  }

  private shuffleStudents(students: CompanyGreedyStudent[]): CompanyGreedyStudent[] {
    const shuffledStudents = [...students];
    for (let index = shuffledStudents.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledStudents[index], shuffledStudents[randomIndex]] = [
        shuffledStudents[randomIndex],
        shuffledStudents[index],
      ];
    }
    return shuffledStudents;
  }

  private initializeAllocations(projects: CompanyGreedyProject[]): Allocation[] {
    return projects.map(project => ({
      projectId: project.id,
      students: [],
    }));
  }

  private applyLocks(
    input: CompanyGreedyMatchingInput,
    eligibleStudents: CompanyGreedyStudent[],
    allocations: Allocation[],
    assignedStudentIds: Set<string>
  ): void {
    input.locks.forEach((projectId, studentId) => {
      const student = eligibleStudents.find(candidate => candidate.id === studentId);
      const project = input.projects.find(candidate => candidate.id === projectId);
      const allocation = allocations.find(candidate => candidate.projectId === projectId);

      if (!student || !project || !allocation || assignedStudentIds.has(studentId)) {
        console.warn(`Skipping invalid locked assignment for student "${studentId}" and project "${projectId}".`);
        return;
      }

      if (!this.canAssignStudentToProject(student, project, allocation, assignedStudentIds, input.constraintWrappers)) {
        console.warn(
          `Skipping locked assignment that violates company matching constraints for student "${studentId}".`
        );
        return;
      }

      allocation.students.push(student.id);
      assignedStudentIds.add(student.id);
    });
  }

  private fillPrimarySlots(
    projects: CompanyGreedyProject[],
    students: CompanyGreedyStudent[],
    allocations: Allocation[],
    assignedStudentIds: Set<string>,
    constraintWrappers: ConstraintWrapper[] = []
  ): void {
    projects.forEach(project => {
      const allocation = this.getAllocation(allocations, project.id);
      if (!allocation || allocation.students.length > 0 || !this.hasCapacity(project, allocation)) {
        return;
      }
      this.assignBestCandidate(project, students, allocation, assignedStudentIds, constraintWrappers);
    });
  }

  private fillRemainingCapacity(
    projects: CompanyGreedyProject[],
    students: CompanyGreedyStudent[],
    allocations: Allocation[],
    assignedStudentIds: Set<string>,
    constraintWrappers: ConstraintWrapper[] = []
  ): void {
    let assignedInLastPass = true;

    while (assignedInLastPass) {
      assignedInLastPass = false;

      projects.forEach(project => {
        const allocation = this.getAllocation(allocations, project.id);
        if (!allocation || !this.hasCapacity(project, allocation)) {
          return;
        }

        const assigned = this.assignBestCandidate(
          project,
          students,
          allocation,
          assignedStudentIds,
          constraintWrappers
        );
        assignedInLastPass = assignedInLastPass || assigned;
      });
    }
  }

  private assignBestCandidate(
    project: CompanyGreedyProject,
    students: CompanyGreedyStudent[],
    allocation: Allocation,
    assignedStudentIds: Set<string>,
    constraintWrappers: ConstraintWrapper[]
  ): boolean {
    const candidate = this.findBestCandidate(project, students, allocation, assignedStudentIds, constraintWrappers);
    if (!candidate) {
      return false;
    }

    allocation.students.push(candidate.id);
    assignedStudentIds.add(candidate.id);
    return true;
  }

  private findBestCandidate(
    project: CompanyGreedyProject,
    students: CompanyGreedyStudent[],
    allocation: Allocation,
    assignedStudentIds: Set<string>,
    constraintWrappers: ConstraintWrapper[]
  ): CompanyGreedyStudent | undefined {
    return (
      students.find(student =>
        this.isPerfectMatch(student, project, allocation, assignedStudentIds, constraintWrappers)
      ) ||
      students.find(student =>
        this.isQualifiedMatch(student, project, allocation, assignedStudentIds, constraintWrappers)
      ) ||
      students.find(student =>
        this.isGeneralMatch(student, project, allocation, assignedStudentIds, constraintWrappers)
      )
    );
  }

  private isPerfectMatch(
    student: CompanyGreedyStudent,
    project: CompanyGreedyProject,
    allocation: Allocation,
    assignedStudentIds: Set<string>,
    constraintWrappers: ConstraintWrapper[]
  ): boolean {
    return (
      this.canAssignStudentToProject(student, project, allocation, assignedStudentIds, constraintWrappers) &&
      this.matchesProjectTypeInterest(student, project) &&
      student.registeredBefore === true
    );
  }

  private isQualifiedMatch(
    student: CompanyGreedyStudent,
    project: CompanyGreedyProject,
    allocation: Allocation,
    assignedStudentIds: Set<string>,
    constraintWrappers: ConstraintWrapper[]
  ): boolean {
    return (
      this.canAssignStudentToProject(student, project, allocation, assignedStudentIds, constraintWrappers) &&
      student.registeredBefore === true
    );
  }

  private isGeneralMatch(
    student: CompanyGreedyStudent,
    project: CompanyGreedyProject,
    allocation: Allocation,
    assignedStudentIds: Set<string>,
    constraintWrappers: ConstraintWrapper[]
  ): boolean {
    return (
      this.canAssignStudentToProject(student, project, allocation, assignedStudentIds, constraintWrappers) &&
      student.registeredBefore !== true
    );
  }

  private canAssignStudentToProject(
    student: CompanyGreedyStudent,
    project: CompanyGreedyProject,
    allocation: Allocation,
    assignedStudentIds: Set<string>,
    constraintWrappers: ConstraintWrapper[]
  ): boolean {
    return (
      !assignedStudentIds.has(student.id) &&
      this.hasCapacity(project, allocation) &&
      this.matchesStudyProgram(student, project) &&
      this.satisfiesActiveNationalityConstraints(student, project, allocation, constraintWrappers)
    );
  }

  private hasCapacity(project: CompanyGreedyProject, allocation: Allocation): boolean {
    return allocation.students.length < this.getProjectCapacity(project);
  }

  private getProjectCapacity(project: CompanyGreedyProject): number {
    return project.capacity ?? Number.MAX_SAFE_INTEGER;
  }

  private matchesStudyProgram(student: CompanyGreedyStudent, project: CompanyGreedyProject): boolean {
    return !project.preferredStudyPrograms?.length || project.preferredStudyPrograms.includes(student.studyProgram);
  }

  private matchesProjectTypeInterest(student: CompanyGreedyStudent, project: CompanyGreedyProject): boolean {
    return !!project.projectType && !!student.preferredProjectTypes?.includes(project.projectType);
  }

  private satisfiesActiveNationalityConstraints(
    student: CompanyGreedyStudent,
    project: CompanyGreedyProject,
    allocation: Allocation,
    constraintWrappers: ConstraintWrapper[]
  ): boolean {
    const activeNationalityConstraints = constraintWrappers.filter(
      constraintWrapper =>
        constraintWrapper.isActive &&
        constraintWrapper.projectIds.includes(project.id) &&
        constraintWrapper.constraintFunction.propertyId === this.NATIONALITY_CONSTRAINT_PROPERTY_ID
    );
    const projectedStudentIds = [...allocation.students, student.id];

    return activeNationalityConstraints.every(constraintWrapper => {
      const matchingStudentCount = projectedStudentIds.filter(studentId =>
        constraintWrapper.constraintFunction.studentIds.includes(studentId)
      ).length;

      return matchingStudentCount <= constraintWrapper.threshold.upperBound;
    });
  }

  private getAllocation(allocations: Allocation[], projectId: string): Allocation | undefined {
    return allocations.find(allocation => allocation.projectId === projectId);
  }
}
