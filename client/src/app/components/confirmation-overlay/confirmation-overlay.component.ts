import { Component, OnInit } from '@angular/core';
import { OverlayComponentData, OverlayService } from '../../overlay.service';
import { ConfirmationOverlayData } from 'src/app/shared/models/overlay-data/confirmation-overlay-data';

@Component({
  selector: 'app-confirmation-overlay',
  templateUrl: './confirmation-overlay.component.html',
  styleUrls: ['./confirmation-overlay.component.scss'],
  standalone: false,
})
export class ConfirmationOverlayComponent implements OverlayComponentData, OnInit {
  data: ConfirmationOverlayData;

  private defaultData = {
    title: 'Confirm action',
    description: 'This is a confirmation dialog. Are you sure you want to proceed?',
    primaryAction: () => {},
    primaryText: 'Submit',
    primaryButtonClass: 'btn-primary',

    secondaryAction: () => {
      this.overlayService.closeOverlay();
    },
    secondaryText: 'Cancel',
    secondaryButtonStyle: 'btn-secondary',

    isDismissable: true,
  };

  constructor(private overlayService: OverlayService) {}

  ngOnInit(): void {
    this.data = { ...this.defaultData, ...this.data };
  }
}
