import { Injectable } from '@angular/core';
import { ChartConfiguration, ChartData, TooltipItem } from 'chart.js';
import { AllocationData, ProjectData } from 'src/app/shared/models/allocation-data';
import { ChartDataFormatter } from '../chart-data-formatter';
import { Student } from 'src/app/api/models';
import { ChartProjectData } from '../people-chart-data';
import { SelectData } from 'src/app/shared/matching/constraints/constraint-functions/constraint-function';

@Injectable({
  providedIn: 'root',
})
export class PriorityChartDataService implements ChartDataFormatter {
  private readonly PRIORITY_ZONE_LABELS = ['High Priority', 'Medium Priority', 'Low Priority', 'Unassigned'];
  private readonly BACKGROUND_COLORS = ['#94DA7C', '#EED373', '#E16868', '#E0E0E0'];
  private readonly DEFAULT_X_MAX = 4;

  getSelectData(): SelectData[] {
    return [{ name: 'Priority Distribution', id: 'statistics-priority-distribution', group: 'Other', reference: this }];
  }

  getDoughnutData(allocationData: AllocationData): ChartData<'doughnut', number[], unknown> {
    const priorityZoneCounts = new Map(this.PRIORITY_ZONE_LABELS.map(priority => [priority, 0]));

    allocationData.projectsData.forEach(projectData => {
      projectData.students.forEach(student => {
        const priority = this.getStudentPriorityForProject(student, projectData.project.id);
        const priorityZoneLabel = this.getPriorityZoneLabel(priority);
        const currentCount = priorityZoneCounts.get(priorityZoneLabel);
        priorityZoneCounts.set(priorityZoneLabel, currentCount + 1);
      });
    });

    priorityZoneCounts.set(this.PRIORITY_ZONE_LABELS[3], allocationData.studentsWithoutTeam.length);

    return {
      labels: this.PRIORITY_ZONE_LABELS,
      datasets: [
        {
          data: Array.from(priorityZoneCounts.values()),
          backgroundColor: this.BACKGROUND_COLORS,
        },
      ],
    };
  }

  getProjectData(allocationData: AllocationData): ChartProjectData[] {
    const data: ChartProjectData[] = [];

    const projectCount = allocationData.projectsData.length;
    const priorityMaps = this.getPriorityMaps(allocationData.projectsData);
    const highestPriorityCount = this.getHighestPriorityCount(priorityMaps);

    allocationData.projectsData.forEach(projectData => {
      const priorityMap = priorityMaps.get(projectData.project.id);
      const barChartOptions = this.getChartConfigurationOptions(projectData, projectCount, highestPriorityCount);

      const labels = Array.from({ length: projectCount }, (_, index) => index.toString());

      const chartConfiguration: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: projectData.project.id,
              data: priorityMap,
              backgroundColor: priorityMap.map((_, index) => this.getColorForPriority(index)),
            },
          ],
        },
        options: barChartOptions,
      };

      data.push({
        name: projectData.project.name,
        tag: this.getTag(priorityMap),
        barStudentData: chartConfiguration,
      });
    });

    return data;
  }

  private getHighestPriorityCount(priorityMaps: Map<string, number[]>): number {
    let max = this.DEFAULT_X_MAX;
    priorityMaps.forEach(priorityMap => {
      const projectMax = Math.max(...priorityMap);
      if (projectMax > max) {
        max = projectMax;
      }
    });
    return max;
  }

  private getPriorityZone(priority: number): number {
    if (priority <= 2) {
      return 0;
    } else if (priority === 3) {
      return 1;
    } else if (priority >= 4) {
      return 2;
    }
    return 3;
  }

  private getPriorityZoneLabel(priority: number): string {
    const priorityZone = this.getPriorityZone(priority);
    return this.PRIORITY_ZONE_LABELS[priorityZone];
  }

  private getStudentPriorityForProject(student: Student, projectId: string): number {
    return student.projectPreferences.find(project => project.projectId === projectId)?.priority ?? 0;
  }

  private getColorForPriority(priority: number): string {
    const priorityZone = this.getPriorityZone(priority);
    return this.BACKGROUND_COLORS[priorityZone];
  }

  private getTag(priorities: number[]): string {
    let priorityCount = 0;
    let studentCount = 0;

    priorities.forEach((priority, index) => {
      priorityCount += priority * (index + 1);
      studentCount += priority;
    });

    return 'Ø ' + (priorityCount / studentCount || 0).toFixed(1);
  }

  private getPriorityMaps(projectsData: ProjectData[]): Map<string, number[]> {
    const priorityMaps = new Map<string, number[]>();
    projectsData.forEach(projectData => {
      const priorityMap = new Array(projectsData.length).fill(0);
      projectData.students.forEach(student => {
        const priority = this.getStudentPriorityForProject(student, projectData.project.id);
        priorityMap[priority] += 1;
      });
      priorityMaps.set(projectData.project.id, priorityMap);
    });
    return priorityMaps;
  }

  private getTooltipLabel(context: TooltipItem<'bar'>): string {
    const studentCount = context.parsed.y;
    const priority = context.dataIndex;
    return `Priority ${priority + 1}: ${studentCount}`;
  }

  private getChartConfigurationOptions(
    projectData: ProjectData,
    xMax: number,
    yMax: number
  ): ChartConfiguration<'bar'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        autoPadding: false,
      },
      scales: {
        x: {
          beginAtZero: true,
          max: xMax,
          ticks: {
            callback: (value: number) => {
              return (value + 1).toString();
            },
          },
        },
        y: {
          beginAtZero: true,
          max: yMax,
          ticks: {
            stepSize: 1,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: () => projectData.project.name,
            label: context => this.getTooltipLabel(context),
          },
        },
      },
    };
  }
}
