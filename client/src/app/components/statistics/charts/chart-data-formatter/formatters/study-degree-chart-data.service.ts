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
export class StudyDegreeChartDataService implements ChartDataFormatter {
  private readonly COLORS = ColorService.getSkillProficiencyColors();
  private allocationData: AllocationData;
  private uniqueStudyDegrees: string[] = [];

  getSelectData(): SelectData[] {
    return [
      {
        name: 'Study Degree',
        id: 'statistics-study-degree',
        group: 'Other',
        reference: this,
      },
    ];
  }

  getDoughnutData(allocationData: AllocationData): ChartData<'doughnut', number[], unknown> {
    this.allocationData = allocationData;
    this.updateUniqueStudyDegrees();

    let students = allocationData.projectsData.flatMap(projectData => projectData.students);
    students = students.concat(allocationData.studentsWithoutTeam);

    const studyDegreeMap = new Map(this.uniqueStudyDegrees.map(degree => [degree, 0]));

    students.forEach(student => {
      studyDegreeMap.set(student.studyDegree, (studyDegreeMap.get(student.studyDegree) || 0) + 1);
    });

    // Generate background colors using dynamic mapping
    const backgroundColors = this.uniqueStudyDegrees.map(degree => this.getStudyDegreeColor(degree));

    const datasets = [
      {
        data: Array.from(studyDegreeMap.values()),
        backgroundColor: backgroundColors,
      },
    ];

    return { labels: this.uniqueStudyDegrees, datasets: datasets };
  }

  getProjectData(allocationData: AllocationData): ChartProjectData[] {
    this.allocationData = allocationData;
    this.updateUniqueStudyDegrees();

    const data: ChartProjectData[] = allocationData.projectsData.map(projectData => {
      return this.getStudyDegreeChartProjectData(projectData);
    });
    return data;
  }

  private updateUniqueStudyDegrees(): void {
    if (!this.allocationData) return;

    let students = this.allocationData.projectsData.flatMap(projectData => projectData.students);
    students = students.concat(this.allocationData.studentsWithoutTeam);

    this.uniqueStudyDegrees = students
      .map(student => student.studyDegree)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort(); // Sort for consistency
  }

  private getStudyDegreeChartProjectData(projectData: ProjectData): ChartProjectData {
    const studentData = this.getStudyDegreeChartStudentData(projectData);

    return {
      name: projectData.project.name,
      tag: null,
      peopleStudentData: studentData,
    };
  }

  private getStudyDegreeChartStudentData(projectData: ProjectData): PeopleChartStudentData[] {
    const students = projectData.students.map(student => {
      return {
        studyDegree: student.studyDegree,
        firstName: student.firstName,
        lastName: student.lastName,
      };
    });

    students.sort((a, b) => a.studyDegree.localeCompare(b.studyDegree));

    const studentData: PeopleChartStudentData[] = students.map(student => {
      return {
        color: this.getStudyDegreeColor(student.studyDegree),
        tooltip: this.getStudyDegreeTooltip(student),
      };
    });

    return studentData;
  }

  private getStudyDegreeColor(studyDegree: string): string {
    // Find the index of the degree in the sorted unique degrees array
    const index = this.uniqueStudyDegrees.indexOf(studyDegree);
    return this.COLORS[index % this.COLORS.length];
  }

  private getStudyDegreeTooltip(student): string {
    return student.firstName + ' ' + student.lastName + ': ' + student.studyDegree;
  }
}
