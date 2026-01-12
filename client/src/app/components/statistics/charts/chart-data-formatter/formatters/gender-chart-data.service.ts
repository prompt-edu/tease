import { Injectable } from '@angular/core';
import { ChartDataFormatter } from '../chart-data-formatter';
import { ChartData } from 'chart.js';
import { SelectData } from 'src/app/shared/matching/constraints/constraint-functions/constraint-function';
import { AllocationData, ProjectData } from 'src/app/shared/models/allocation-data';
import { ChartProjectData, PeopleChartStudentData } from '../people-chart-data';
import { Gender } from 'src/app/api/models';
import { ColorService } from 'src/app/shared/constants/color.service';

@Injectable({
  providedIn: 'root',
})
export class GenderChartDataService implements ChartDataFormatter {
  getSelectData(): SelectData[] {
    return [{ name: 'Gender', id: 'statistics-gender', group: 'Other', reference: this }];
  }

  getDoughnutData(allocationData: AllocationData): ChartData<'doughnut', number[], unknown> {
    let students = allocationData.projectsData.flatMap(projectData => projectData.students);
    students = students.concat(allocationData.studentsWithoutTeam);

    const gender = Object.values(Gender);
    const genderMap = new Map(Object.values(gender).map(gender => [gender, 0]));

    students.forEach(student => {
      genderMap.set(student.gender, (genderMap.get(student.gender) || 0) + 1);
    });

    const datasets = [
      {
        data: Array.from(genderMap.values()),
        backgroundColor: Array.from(genderMap.keys()).map(gender => ColorService.getGenderColor(gender)),
      },
    ];

    return { labels: gender, datasets: datasets };
  }

  getProjectData(allocationData: AllocationData): ChartProjectData[] {
    const data: ChartProjectData[] = allocationData.projectsData.map(projectData => {
      return this.getGenderChartProjectData(projectData);
    });
    return data;
  }

  private getGenderChartProjectData(projectData: ProjectData): ChartProjectData {
    const studentData = this.getGenderChartStudentData(projectData);

    return {
      name: projectData.project.name,
      tag: null,
      peopleStudentData: studentData,
    };
  }

  private getGenderChartStudentData(projectData: ProjectData): PeopleChartStudentData[] {
    const students = projectData.students.map(student => {
      return {
        gender: student.gender,
        firstName: student.firstName,
        lastName: student.lastName,
      };
    });

    students.sort((a, b) => a.gender.localeCompare(b.gender));

    const studentData: PeopleChartStudentData[] = students.map(student => {
      return {
        color: ColorService.getGenderColor(student.gender),
        tooltip: this.getGenderTooltip(student),
      };
    });

    return studentData;
  }

  private getGenderTooltip(student): string {
    return student.firstName + ' ' + student.lastName + ': ' + student.gender;
  }
}
