import { Component, ElementRef, ViewChild } from '@angular/core';
import { OverlayComponentData, OverlayService } from '../../overlay.service';
import { SkillsService } from 'src/app/shared/data/skills.service';
import { AllocationsService } from 'src/app/shared/data/allocations.service';
import { ProjectsService } from 'src/app/shared/data/projects.service';
import { StudentsService } from 'src/app/shared/data/students.service';
import { ToastsService } from 'src/app/shared/services/toasts.service';
import { Project, Skill, Student } from 'src/app/api/models';
import { ConstraintsService } from 'src/app/shared/data/constraints.service';
import { IdMappingService } from 'src/app/shared/data/id-mapping.service';
import { LockedStudentsService } from 'src/app/shared/data/locked-students.service';
import { CsvParserService } from 'src/app/shared/services/csv-parser.service';

@Component({
  selector: 'app-import-overlay',
  templateUrl: './import-overlay.component.html',
  styleUrls: ['./import-overlay.component.scss'],
  standalone: false,
})
export class ImportOverlayComponent implements OverlayComponentData {
  data = null;
  @ViewChild('fileInput') fileInput: ElementRef;

  constructor(
    private skillsService: SkillsService,
    private allocationsService: AllocationsService,
    private projectsService: ProjectsService,
    private studentService: StudentsService,
    private constraintsService: ConstraintsService,
    private idMappingService: IdMappingService,
    private lockedStudentsService: LockedStudentsService,
    private toastsService: ToastsService,
    private overlayService: OverlayService,
    private csvParserService: CsvParserService
  ) {}

  importFromCSV() {
    this.fileInput.nativeElement.click();
  }

  async onFileChanged(event) {
    const files: File[] = event.target.files;
    if (files.length !== 1) return;

    const data = await this.csvParserService.getData(files[0]);
    if (!data) {
      this.toastsService.showToast('Invalid CSV file', 'Import ', false);
      return;
    }

    this.setStudentData(data.students, data.projects, data.skills);
  }

  async loadExampleData() {
    this.onFileChanged({ target: { files: ['assets/persons_example.csv'] } });
  }

  private setStudentData(students: Student[], projects: Project[], skills: Skill[]): void {
    this.idMappingService.deleteMapping();
    this.constraintsService.deleteConstraints();
    this.lockedStudentsService.deleteLocks();
    this.studentService.setStudents(students);
    this.projectsService.setProjects(projects);
    this.skillsService.setSkills(skills);
    this.allocationsService.setAllocations([]);

    this.toastsService.showToast('Import successful', 'Import', true);
    this.overlayService.closeOverlay();
  }
}
