import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragulaModule } from 'ng2-dragula';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { ImportOverlayComponent } from './import-overlay/import-overlay.component';
import { ConfirmationOverlayComponent } from './confirmation-overlay/confirmation-overlay.component';
import { IntroCardComponent } from './intro-card/intro-card.component';
import { ExportOverlayComponent } from './export-overlay/export-overlay.component';
import { PersonDetailOverlayComponent } from './person-detail-overlay/person-detail-overlay.component';
import { ReactiveFormsModule } from '@angular/forms';
import { StudentPreviewCardComponent } from './student-preview-card/student-preview-card.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ProjectsComponent } from './projects/projects.component';
import { StatisticsModule } from './statistics/statistics.module';
import { UtilityComponent } from './utility/utility.component';
import { NavigationBarComponent } from './navigation-bar/navigation-bar.component';
import { ConstraintBuilderOverlayComponent } from './constraint-builder-overlay/constraint-builder-overlay.component';
import { ConstraintFunctionBuilderComponent } from './constraint-builder-overlay/constraint-function-builder/constraint-function-builder.component';
import { ConstraintThresholdBuilderComponent } from './constraint-builder-overlay/constraint-threshold-builder/constraint-threshold-builder.component';
import { ConstraintSummaryComponent } from './constraint-summary-view/constraint-summary.component';
import { SharedModule } from '../shared/shared.module';
import { ConstraintBuilderNationalityComponent } from './constraint-builder-nationality/constraint-builder-nationality.component';
import { SelectComponent } from './select/select.component';
import { ConstraintHelpComponent } from './constraint-help/constraint-help.component';
import { ProjectPickerComponent } from './project-picker/project-picker.component';
import { GlobalSearchComponent } from './global-search/global-search.component';

@NgModule({
  declarations: [
    ImportOverlayComponent,
    ConfirmationOverlayComponent,
    IntroCardComponent,
    ExportOverlayComponent,
    PersonDetailOverlayComponent,
    StudentPreviewCardComponent,
    ProjectsComponent,
    UtilityComponent,
    NavigationBarComponent,
    ConstraintBuilderOverlayComponent,
    ConstraintFunctionBuilderComponent,
    ConstraintThresholdBuilderComponent,
    ConstraintSummaryComponent,
    ConstraintBuilderNationalityComponent,
    SelectComponent,
    ConstraintHelpComponent,
    ProjectPickerComponent,
    GlobalSearchComponent,
  ],
  exports: [
    NavigationBarComponent,
    ProjectsComponent,
    UtilityComponent,
    IntroCardComponent,
    ProjectPickerComponent,
  ],
  providers: [],
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    DragulaModule.forRoot(),
    FormsModule,
    NgbModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    StatisticsModule,
    SharedModule,
  ],
})
export class ComponentsModule {}
