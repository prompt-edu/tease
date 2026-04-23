import { Component, ElementRef, ViewChild } from '@angular/core';
import { OverlayComponentData } from '../../overlay.service';
import JSZip from 'jszip';
import { AllocationsService } from 'src/app/shared/data/allocations.service';
import { saveAs } from 'file-saver';
import { Allocation } from 'src/app/api/models';
import { ProjectsService } from 'src/app/shared/data/projects.service';
import { StudentsService } from 'src/app/shared/data/students.service';
import { AllocationData } from 'src/app/shared/models/allocation-data';
import { NgxCaptureService } from 'ngx-capture';
import { Observable, forkJoin, map } from 'rxjs';
import { WorkspaceStateService } from 'src/app/shared/services/workspace-state.service';

@Component({
  selector: 'app-export-overlay',
  templateUrl: './export-overlay.component.html',
  styleUrls: ['./export-overlay.component.scss'],
  standalone: false,
})
export class ExportOverlayComponent implements OverlayComponentData {
  public data: {
    allocationData: AllocationData;
  };
  private readonly EXPORT_FILE_NAME = 'TEASE-mappings.csv';
  private readonly EXPORT_DATA_TYPE = 'text/csv;charset=utf-8';
  private readonly EXPORT_PROJECT_IMAGES_NAME = 'TEASE-projects.zip';

  @ViewChild('projectsScreen', { static: true }) projectsScreen: ElementRef;

  isLoading = false;
  isSavingToPrompt = false;

  constructor(
    private allocationsService: AllocationsService,
    private projectsService: ProjectsService,
    private studentsService: StudentsService,
    private captureService: NgxCaptureService,
    private workspaceStateService: WorkspaceStateService
  ) {}

  /**
   * Primary "Save to PROMPT" action — persists both the workspace and
   * the finalised allocations via `POST /tease/course_phase/{id}/save`.
   *
   * Only available when a PROMPT course phase is currently hydrated
   * (Workflow A or B). Defaults to `false` when running in CSV-only mode.
   */
  get canSaveToPrompt(): boolean {
    return !!this.workspaceStateService.coursePhaseId;
  }

  async saveToPrompt(): Promise<void> {
    if (!this.canSaveToPrompt) return;
    this.isSavingToPrompt = true;
    try {
      await this.workspaceStateService.saveToPrompt();
    } finally {
      this.isSavingToPrompt = false;
    }
  }

  exportCSV() {
    const allocations = this.allocationsService.getAllocations();
    const csvData = this.allocationsToCSV(allocations);
    const blob = new Blob([csvData], { type: this.EXPORT_DATA_TYPE });
    saveAs(blob, this.EXPORT_FILE_NAME);
  }

  private allocationsToCSV(allocations: Allocation[]): string {
    let csvData = 'Username,Team\n';
    allocations.forEach(allocation => {
      const projectName = this.projectsService.getProjectNameById(allocation.projectId);
      allocation.students.forEach(studentId => {
        const student = this.studentsService.getStudentById(studentId);
        const studentName = `${student.firstName} ${student.lastName}`;
        csvData += `${studentName},${projectName}\n`;
      });
    });
    return csvData;
  }

  async exportProjectImages(): Promise<void> {
    this.isLoading = true;

    const projectElements: HTMLElement[] = Array.from(
      this.projectsScreen.nativeElement.getElementsByClassName('project')
    );
    projectElements.push(this.projectsScreen.nativeElement);

    setTimeout(() => {
      const zip = new JSZip();

      const imageObservables = projectElements.map(projectElement => {
        const filename = projectElement.getAttribute('id');
        return this.getImage(projectElement).pipe(map(image => ({ filename, image })));
      });

      forkJoin(imageObservables).subscribe(images => {
        images.forEach(({ filename, image }) => {
          zip.file(`${filename}.png`, image.split(',')[1], { base64: true });
        });

        zip.generateAsync({ type: 'blob' }).then(content => {
          saveAs(content, this.EXPORT_PROJECT_IMAGES_NAME);
          this.isLoading = false;
        });
      });
    }, 100);
  }

  private getImage(element: HTMLElement): Observable<string> {
    return this.captureService.getImage(element, true);
  }
}
