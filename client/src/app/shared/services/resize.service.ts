import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ResizeService {
  private startY = 0;
  private startHeight = 256;
  private currentHeight = 256;

  private onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private onMouseUpHandler = () => this.onMouseUp();

  startResize(event: MouseEvent): void {
    this.startY = event.clientY;
    this.startHeight = this.currentHeight;

    document.addEventListener('mousemove', this.onMouseMoveHandler);
    document.addEventListener('mouseup', this.onMouseUpHandler);
    event.preventDefault();
  }

  private onMouseMove(event: MouseEvent): void {
    const deltaY = this.startY - event.clientY;
    this.currentHeight = Math.max(256, this.startHeight + deltaY);
    document.documentElement.style.setProperty('--utility-height', `${this.currentHeight}px`);
  }

  private onMouseUp(): void {
    document.removeEventListener('mousemove', this.onMouseMoveHandler);
    document.removeEventListener('mouseup', this.onMouseUpHandler);
  }

  cleanup(): void {
    this.onMouseUp();
  }
}
