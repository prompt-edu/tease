import { Injectable } from '@angular/core';

/** Highlight effect duration (ms) — class is removed after this. */
const HIGHLIGHT_DURATION_MS = 2500;

/** CSS class applied to the matching student card; styled in `styles.scss`. */
const HIGHLIGHT_CLASS = 'global-search-highlight';

/**
 * Locates a student's card on the team-allocation board and draws
 * attention to it: scrolls into view, then applies a temporary CSS
 * class for a glow / pulse animation.
 *
 * The DOM contract: each student card carries `id={studentId}`
 * (already enforced by the existing drag-drop wiring in
 * `app.component.ts:handleStudentDrop`).
 */
@Injectable({
  providedIn: 'root',
})
export class StudentHighlightService {
  highlight(studentId: string): boolean {
    if (!studentId) return false;
    if (typeof document === 'undefined') return false;

    const element = document.getElementById(studentId);
    if (!element) return false;

    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    element.classList.remove(HIGHLIGHT_CLASS); // restart the animation if it's still playing
    // Force reflow so removing then re-adding the class re-triggers CSS animation.
    void element.offsetWidth;
    element.classList.add(HIGHLIGHT_CLASS);

    window.setTimeout(() => {
      element.classList.remove(HIGHLIGHT_CLASS);
    }, HIGHLIGHT_DURATION_MS);

    return true;
  }
}
