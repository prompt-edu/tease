import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appOverlayHost]',
  standalone: false,
})
export class OverlayHostDirective {
  constructor(public viewContainerRef: ViewContainerRef) {}
}
