import { Injectable } from '@angular/core';
import { ChartData } from 'chart.js';
import { AllocationData, ProjectData } from 'src/app/shared/models/allocation-data';
import { ChartDataFormatter } from '../chart-data-formatter';
import { ColorService } from 'src/app/shared/constants/color.service';
import { SkillProficiency, Student } from 'src/app/api/models';
import { Comparator, Operator, SkillLevels } from 'src/app/shared/matching/constraints/constraint-utils';
import { ChartProjectData, PeopleChartStudentData } from '../people-chart-data';
import { SelectData } from 'src/app/shared/matching/constraints/constraint-functions/constraint-function';
import { SkillsService } from 'src/app/shared/data/skills.service';

@Injectable({
  providedIn: 'root',
})
export class SkillsProficiencyChartDataService implements ChartDataFormatter {
  private readonly BACKGROUND_COLORS = [...ColorService.getSkillProficiencyColors()];

  constructor(private skillsService: SkillsService) {}

  getSelectData(): SelectData[] {
    const skills = this.skillsService.getSkills();
    return skills.map(skill => ({
      name: skill.title,
      id: `${skill.id}`,
      group: 'Skills',
      reference: this,
    }));
  }

  getDoughnutData(allocationData: AllocationData, skillId: string): ChartData<'doughnut', number[], unknown> {
    const skillProficiencies = Object.values(SkillProficiency);
    const skillProficienciesMap = new Map(skillProficiencies.map(skill => [skill, 0]));

    let students = allocationData.projectsData.flatMap(projectData => projectData.students);
    students = students.concat(allocationData.studentsWithoutTeam);
    students.forEach(student => this.updateSkillProficiencyCount(skillProficienciesMap, student, skillId));

    const datasets = [
      {
        data: Array.from(skillProficienciesMap.values()),
        backgroundColor: this.BACKGROUND_COLORS,
      },
    ];

    console.log({ labels: skillProficiencies, datasets: datasets });
    return { labels: skillProficiencies, datasets: datasets };
  }

  getProjectData(allocationData: AllocationData, skillId: string): ChartProjectData[] {
    const data: ChartProjectData[] = allocationData.projectsData.map(projectData => {
      return this.getPeopleChartProjectData(projectData, skillId);
    });
    return data;
  }

  private getPeopleChartProjectData(projectData: ProjectData, skillId: string): ChartProjectData {
    const studentData = this.getPeopleChartStudentData(projectData, skillId);

    return {
      name: projectData.project.name,
      tag: null,
      peopleStudentData: studentData,
    };
  }

  private getPeopleChartStudentData(projectData: ProjectData, skillId: string): PeopleChartStudentData[] {
    const students = projectData.students.map(student => {
      const skill = student.skills.find(skill => skill.id === skillId);
      return {
        skill: skill,
        firstName: student.firstName,
        lastName: student.lastName,
      };
    });

    students.sort((a, b) =>
      Comparator[Operator.GREATER_THAN_OR_EQUAL](SkillLevels[a.skill.proficiency], SkillLevels[b.skill.proficiency])
        ? -1
        : 1
    );

    const studentData: PeopleChartStudentData[] = students.map(student => {
      return {
        color: ColorService.getSkillProficiencyColor(student.skill.proficiency),
        tooltip: this.getTooltip(student),
      };
    });

    return studentData;
  }

  private updateSkillProficiencyCount(
    skillProficienciesMap: Map<SkillProficiency, number>,
    student: Student,
    skillId: string
  ): void {
    const skillProficiency = student.skills.find(skill => skill.id === skillId).proficiency;
    const skillProficiencyCount = skillProficienciesMap.get(skillProficiency);
    skillProficienciesMap.set(skillProficiency, skillProficiencyCount + 1);
  }

  private getTooltip(student): string {
    return student.firstName + ' ' + student.lastName + ': ' + student.skill.proficiency;
  }
}
