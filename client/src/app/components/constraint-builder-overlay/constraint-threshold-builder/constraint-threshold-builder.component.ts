import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ThresholdWrapper } from 'src/app/shared/matching/constraints/constraint';
import { integerValidator, positiveValidator } from 'src/app/shared/utils/validators.utils';

@Component({
  selector: 'app-constraint-threshold-builder',
  templateUrl: './constraint-threshold-builder.component.html',
  styleUrl: './constraint-threshold-builder.component.scss',
  standalone: false,
})
export class ConstraintThresholdBuilderComponent implements OnInit, OnDestroy {
  form: FormGroup;
  private subscriptions: Subscription[] = [];
  @Output() thresholdChange = new EventEmitter<ThresholdWrapper>();
  @Input() thresholdWrapper: ThresholdWrapper;

  constructor() {}

  ngOnInit(): void {
    const lowerBound = this.thresholdWrapper.lowerBound;
    const upperBound = this.thresholdWrapper.upperBound;

    this.form = new FormGroup({
      lowerBound: new FormControl<number>(lowerBound, [integerValidator, positiveValidator]),
      upperBound: new FormControl<number>(upperBound, [integerValidator, positiveValidator]),
    });
    this.thresholdChange.emit(new ThresholdWrapper(lowerBound, upperBound));

    this.subscriptions.push(
      this.form.valueChanges.subscribe(() => {
        this.updateThreshold();
      })
    );
  }

  private updateThreshold(): void {
    if (this.form.invalid) {
      this.thresholdChange.emit(null);
      return;
    }
    const lowerBound = this.form.get('lowerBound').value;
    const upperBound = this.form.get('upperBound').value;
    this.thresholdChange.emit(new ThresholdWrapper(lowerBound, upperBound));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription?.unsubscribe());
  }
}
