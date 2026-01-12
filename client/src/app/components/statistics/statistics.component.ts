import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { AllocationData } from 'src/app/shared/models/allocation-data';
import { ChartProjectData } from './charts/chart-data-formatter/people-chart-data';
import { ChartDataFormatter } from './charts/chart-data-formatter/chart-data-formatter';

@Component({
  standalone: false,
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss',
})
export class StatisticsComponent implements OnInit, OnChanges {
  @Input({ required: true }) allocationData: AllocationData;
  @Input({ required: true }) selectedDataId: string;
  @Input({ required: true }) formatter: ChartDataFormatter;

  doughnutChartData: ChartConfiguration<'doughnut'>['data'];
  peopleChartData: ChartProjectData[];

  constructor() {}

  ngOnInit() {
    this.updateChartData();
  }

  ngOnChanges(): void {
    this.updateChartData();
  }

  updateChartData(): void {
    if (!this.allocationData || !this.selectedDataId || !this.formatter) {
      return;
    }
    this.peopleChartData = this.formatter.getProjectData(this.allocationData, this.selectedDataId);
    this.doughnutChartData = this.formatter.getDoughnutData(this.allocationData, this.selectedDataId);
  }
}
