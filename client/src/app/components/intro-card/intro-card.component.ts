import { Component } from '@angular/core';
import { OverlayService } from 'src/app/overlay.service';
import { ImportOverlayComponent } from '../import-overlay/import-overlay.component';
import { facImportIcon } from 'src/assets/icons/icons';

@Component({
  selector: 'app-intro-card',
  templateUrl: './intro-card.component.html',
  styleUrls: ['./intro-card.component.scss'],
  standalone: false,
})
export class IntroCardComponent {
  facImportIcon = facImportIcon;

  constructor(private overlayService: OverlayService) {}

  showImportOverlay() {
    this.overlayService.displayComponent(ImportOverlayComponent);
  }
}
