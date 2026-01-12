import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Allocation } from 'src/app/api/models';
import { WebsocketService } from '../network/websocket.service';
import { CourseIterationsService } from './course-iteration.service';

@Injectable({
  providedIn: 'root',
})
export class AllocationsService {
  private allocationsSubject$: BehaviorSubject<Allocation[]> = new BehaviorSubject<Allocation[]>([]);

  constructor(
    private websocketService: WebsocketService,
    private courseIterationsService: CourseIterationsService
  ) {
    try {
      const storedAllocations = localStorage.getItem('allocations') || '[]';
      const allocations = JSON.parse(storedAllocations);
      this.setAllocations(allocations);
    } catch (error) {
      this.deleteAllocations();
    }
  }

  setAllocations(allocations: Allocation[], sentWebSocketUpdate: boolean = true): void {
    if (!allocations) {
      allocations = [];
    }

    this.allocationsSubject$.next(allocations);
    localStorage.setItem('allocations', this.getAllocationsAsString());

    const courseIterationId = this.courseIterationsService.getCourseIteration()?.id;
    if (sentWebSocketUpdate && courseIterationId) {
      this.websocketService.send(courseIterationId, 'allocations', this.getAllocationsAsString());
    }
  }

  deleteAllocations(): void {
    this.setAllocations([]);
  }

  getAllocations(): Allocation[] {
    return this.allocationsSubject$.getValue();
  }

  get allocations$(): Observable<Allocation[]> {
    return this.allocationsSubject$.asObservable();
  }

  moveStudentToProject(studentId: string, projectId: string): void {
    this.moveStudentToProjectAtPosition(studentId, projectId);
  }

  /**
   * Moves a student to a specified project at a given position relative to a sibling.
   * If no siblings is provided, the student is added to the end of the project.
   *
   * @param {string} studentId - The ID of the student to move.
   * @param {string} projectId - The ID of the project to which the student will be moved.
   * @param {string} [siblingId] - The ID of the sibling student. If provided, the student will be placed next to this sibling. If not found or not provided, the student is added to the end.
   * @returns {void}
   */
  moveStudentToProjectAtPosition(studentId: string, projectId: string, siblingId?: string): void {
    const allocations = this.getAllocationsWithoutStudent(studentId);
    const allocation = this.getAllocationForProjectId(projectId);
    let positionInAllocation = allocation?.students.indexOf(siblingId) ?? -1;

    if (allocation && positionInAllocation === -1) {
      positionInAllocation = allocation.students.length;
    }

    if (allocation) {
      allocation.students.splice(positionInAllocation, 0, studentId);
    } else {
      allocations.push({ projectId, students: [studentId] });
    }

    this.setAllocations(allocations);
  }

  /**
   * Retrieves all allocations and filters out the specified student from each allocation.
   *
   * @private
   * @param {string} studentId - The ID of the student to be removed from the allocations.
   * @returns {Allocation[]} - An array of allocations with the specified student removed.
   */
  private getAllocationsWithoutStudent(studentId: string): Allocation[] {
    const allocations = this.getAllocations();
    allocations.forEach(allocation => {
      allocation.students = allocation.students.filter(id => id !== studentId);
    });
    return allocations;
  }

  removeStudentFromAllocations(studentId: string): void {
    const allocations = this.getAllocations();
    allocations.forEach(allocation => {
      allocation.students = allocation.students.filter(id => id !== studentId);
    });
    this.setAllocations(allocations);
  }

  private getAllocationForProjectId(projectId: string): Allocation {
    return this.getAllocations().find(allocation => allocation.projectId === projectId);
  }

  equalsCurrentAllocations(allocations: Allocation[]): boolean {
    return JSON.stringify(allocations) === this.getAllocationsAsString();
  }

  getAllocationsAsString(): string {
    return JSON.stringify(this.getAllocations());
  }
}
