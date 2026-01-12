import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { OverlayComponentData, OverlayService } from '../../overlay.service';
import { PromptService } from 'src/app/shared/services/prompt.service';
import { SkillsService } from 'src/app/shared/data/skills.service';
import { AllocationsService } from 'src/app/shared/data/allocations.service';
import { ProjectsService } from 'src/app/shared/data/projects.service';
import { StudentsService } from 'src/app/shared/data/students.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastsService } from 'src/app/shared/services/toasts.service';
import { Allocation, CourseIteration, Project, Skill, Student } from 'src/app/api/models';
import { ConstraintsService } from 'src/app/shared/data/constraints.service';
import { IdMappingService } from 'src/app/shared/data/id-mapping.service';
import { LockedStudentsService } from 'src/app/shared/data/locked-students.service';
import { CsvParserService } from 'src/app/shared/services/csv-parser.service';
import { SelectData } from 'src/app/shared/matching/constraints/constraint-functions/constraint-function';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CourseIterationsService } from 'src/app/shared/data/course-iteration.service';
import { CollaborationService } from 'src/app/shared/services/collaboration.service';

@Component({
  selector: 'app-import-overlay',
  templateUrl: './import-overlay.component.html',
  styleUrls: ['./import-overlay.component.scss'],
  standalone: false,
})
export class ImportOverlayComponent implements OverlayComponentData, OnInit {
  data = null;
  @ViewChild('fileInput') fileInput: ElementRef;
  private courseIterations: CourseIteration[];
  courseIterationSelectData: SelectData[] = [];
  form: FormGroup;

  constructor(
    private promptService: PromptService,
    //data services
    private skillsService: SkillsService,
    private allocationsService: AllocationsService,
    private projectsService: ProjectsService,
    private studentService: StudentsService,
    private constraintsService: ConstraintsService,
    private idMappingService: IdMappingService,
    private lockedStudentsService: LockedStudentsService,
    private courseIterationsService: CourseIterationsService,

    private toastsService: ToastsService,
    private overlayService: OverlayService,
    private csvParserService: CsvParserService,
    private collaborationService: CollaborationService
  ) {}

  ngOnInit(): void {
    if (this.isImportPossible()) {
      this.form = new FormGroup({
        courseIteration: new FormControl<string>(null, Validators.required),
      });
      this.getCourseIterations();
    }
  }

  importFromCSV() {
    this.fileInput.nativeElement.click();
  }

  isImportPossible(): boolean {
    return this.promptService.isImportPossible();
  }

  async getCourseIterations(): Promise<void> {
    try {
      this.courseIterations = (await this.promptService.getCourseIterations()) || [];
      this.courseIterationSelectData = this.courseIterations.map(courseIteration => {
        return { id: courseIteration.id, name: courseIteration.semesterName };
      });
      if (this.courseIterations) {
        this.form.get('courseIteration').patchValue(this.courseIterations[0]?.id);
      } else {
        this.toastsService.showToast(`No course iterations found`, 'Import failed', false);
      }
    } catch (error) {
      this.toastsService.showToast(`Error while fetching course iterations`, 'Import failed', false);
    }
  }

  async importFromPrompt(): Promise<void> {
    if (!this.isImportPossible()) {
      return;
    }

    try {
      const courseIterationId = this.form.get('courseIteration').value;
      const courseIteration = this.courseIterations.find(courseIteration => courseIteration.id === courseIterationId);
      if (!courseIteration) {
        this.toastsService.showToast('Invalid course iteration', 'Import failed', false);
        return;
      }

      const students = await this.promptService.getStudents(courseIterationId);
      const projects = await this.promptService.getProjects(courseIterationId);
      const skills = await this.promptService.getSkills(courseIterationId);
      const allocations = await this.promptService.getAllocations(courseIterationId);

      this.setStudentData(students, projects, skills, allocations, courseIteration);
      this.collaborationService.connect(courseIterationId);
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        this.toastsService.showToast(`Error ${error.status}: ${error.statusText}`, 'Import failed', false);
      } else {
        this.toastsService.showToast(`Unknown error`, 'Import failed', false);
      }
      return;
    }
  }

  async onFileChanged(event) {
    const files: File[] = event.target.files;
    if (files.length !== 1) return;

    const file: File = files[0];
    const data = await this.csvParserService.getData(file);
    if (!data) {
      this.toastsService.showToast('Invalid CSV file', 'Import ', false);
      return;
    }

    this.setStudentData(data.students, data.projects, data.skills, []);
  }

  async loadExampleData() {
    this.onFileChanged({ target: { files: ['assets/persons_example.csv'] } });
  }

  private setStudentData(
    students: Student[],
    projects: Project[],
    skills: Skill[],
    allocations: Allocation[],
    courseIteration?: CourseIteration
  ): void {
    this.courseIterationsService.setCourseIteration(courseIteration);

    this.idMappingService.deleteMapping();
    this.constraintsService.deleteConstraints();
    this.lockedStudentsService.deleteLocks();
    this.studentService.deleteStudents();
    this.projectsService.deleteProjects();
    this.skillsService.deleteSkills();
    this.studentService.setStudents(students);
    this.projectsService.setProjects(projects);
    this.skillsService.setSkills(skills);
    this.allocationsService.setAllocations(allocations);

    this.toastsService.showToast('Import successful', 'Import', true);
    this.overlayService.closeOverlay();
  }
}
