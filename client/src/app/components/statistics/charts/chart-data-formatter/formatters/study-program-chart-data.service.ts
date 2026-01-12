import { Injectable } from '@angular/core';
import { ChartData } from 'chart.js';
import { AllocationData, ProjectData } from 'src/app/shared/models/allocation-data';
import { ChartDataFormatter } from '../chart-data-formatter';
import { ChartProjectData, PeopleChartStudentData } from '../people-chart-data';
import { SelectData } from 'src/app/shared/matching/constraints/constraint-functions/constraint-function';
import { ColorService } from 'src/app/shared/constants/color.service';

@Injectable({
  providedIn: 'root',
})
export class StudyProgramChartDataService implements ChartDataFormatter {
  private readonly COLORS = ColorService.getSkillProficiencyColors();
  private allocationData: AllocationData;
  private uniqueStudyPrograms: string[] = [];

  getSelectData(): SelectData[] {
    return [
      {
        name: 'Study Program',
        id: 'statistics-study-program',
        group: 'Other',
        reference: this,
      },
    ];
  }

  getDoughnutData(allocationData: AllocationData): ChartData<'doughnut', number[], unknown> {
    this.allocationData = allocationData;
    this.updateUniqueStudyPrograms();

    let students = allocationData.projectsData.flatMap(projectData => projectData.students);
    students = students.concat(allocationData.studentsWithoutTeam);

    const studyProgramMap = new Map(this.uniqueStudyPrograms.map(program => [program, 0]));

    students.forEach(student => {
      studyProgramMap.set(student.studyProgram, (studyProgramMap.get(student.studyProgram) || 0) + 1);
    });

    // Generate background colors using dynamic mapping
    const backgroundColors = this.uniqueStudyPrograms.map(program => this.getStudyProgramColor(program));

    const datasets = [
      {
        data: Array.from(studyProgramMap.values()),
        backgroundColor: backgroundColors,
      },
    ];

    return { labels: this.uniqueStudyPrograms, datasets: datasets };
  }

  getProjectData(allocationData: AllocationData): ChartProjectData[] {
    this.allocationData = allocationData;
    this.updateUniqueStudyPrograms();

    const data: ChartProjectData[] = allocationData.projectsData.map(projectData => {
      return this.getStudyProgramChartProjectData(projectData);
    });
    return data;
  }

  private updateUniqueStudyPrograms(): void {
    if (!this.allocationData) return;

    let students = this.allocationData.projectsData.flatMap(projectData => projectData.students);
    students = students.concat(this.allocationData.studentsWithoutTeam);

    this.uniqueStudyPrograms = students
      .map(student => student.studyProgram)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort(); // Sort for consistency
  }

  private getStudyProgramChartProjectData(projectData: ProjectData): ChartProjectData {
    const studentData = this.getStudyProgramChartStudentData(projectData);

    return {
      name: projectData.project.name,
      tag: null,
      peopleStudentData: studentData,
    };
  }

  private getStudyProgramChartStudentData(projectData: ProjectData): PeopleChartStudentData[] {
    const students = projectData.students.map(student => {
      return {
        studyProgram: student.studyProgram,
        firstName: student.firstName,
        lastName: student.lastName,
      };
    });

    students.sort((a, b) => a.studyProgram.localeCompare(b.studyProgram));

    const studentData: PeopleChartStudentData[] = students.map(student => {
      return {
        color: this.getStudyProgramColor(student.studyProgram),
        tooltip: this.getStudyProgramTooltip(student),
      };
    });

    return studentData;
  }

  private getStudyProgramColor(studyProgram: string): string {
    // Find the index of the program in the sorted unique programs array
    const index = this.uniqueStudyPrograms.indexOf(studyProgram);
    return this.COLORS[index % this.COLORS.length];
  }

  private getStudyProgramTooltip(student): string {
    return student.firstName + ' ' + student.lastName + ': ' + student.studyProgram;
  }
}
