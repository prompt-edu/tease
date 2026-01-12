import { Component, ElementRef, ViewChild } from '@angular/core';
import { OverlayComponentData } from '../../overlay.service';
import JSZip from 'jszip';
import { PromptService } from 'src/app/shared/services/prompt.service';
import { ToastsService } from 'src/app/shared/services/toasts.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AllocationsService } from 'src/app/shared/data/allocations.service';
import { saveAs } from 'file-saver';
import { Allocation } from 'src/app/api/models';
import { ProjectsService } from 'src/app/shared/data/projects.service';
import { StudentsService } from 'src/app/shared/data/students.service';
import { AllocationData } from 'src/app/shared/models/allocation-data';
import { NgxCaptureService } from 'ngx-capture';
import { Observable, forkJoin, map } from 'rxjs';
import { CourseIterationsService } from 'src/app/shared/data/course-iteration.service';

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

  constructor(
    private promptService: PromptService,
    private toastsService: ToastsService,
    private allocationsService: AllocationsService,
    private projectsService: ProjectsService,
    private studentsService: StudentsService,
    private courseIterationsService: CourseIterationsService,
    private captureService: NgxCaptureService
  ) {}

  async exportPrompt() {
    const allocations = this.allocationsService.getAllocations();
    try {
      const courseIteration = this.courseIterationsService.getCourseIteration();
      if (await this.promptService.postAllocations(allocations, courseIteration?.id)) {
        this.toastsService.showToast('Export successful', 'Export', true);
      } else {
        this.toastsService.showToast('Export failed', 'Export', false);
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        console.log('Error while fetching data: ', error);
        this.toastsService.showToast(`Error ${error.status}: ${error.statusText}`, 'Export failed', false);
      } else {
        console.log('Unknown error: ', error);
      }
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
