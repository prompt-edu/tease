import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  GlobalSearchService,
  SearchResult,
} from 'src/app/shared/services/global-search.service';
import { StudentHighlightService } from 'src/app/shared/services/student-highlight.service';
import { ToastsService } from 'src/app/shared/services/toasts.service';

/**
 * Header-mounted participant search.
 *
 * UX:
 *  - Type ≥ 2 chars → debounced search across loaded students
 *    (name / email / skill title — see GlobalSearchService for scope).
 *  - Arrow Up/Down navigates the dropdown, Enter activates the focused
 *    result (or the top result if none focused), Escape closes it.
 *  - Clicking a result scrolls the matching card into view on the
 *    team-allocation board and applies a brief highlight pulse.
 */
@Component({
  selector: 'app-global-search',
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.scss'],
  standalone: false,
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  /** Search-input form control bound to the textbox. */
  readonly query = new FormControl<string>('', { nonNullable: true });

  /** Latest search results to render in the dropdown. */
  results: SearchResult[] = [];

  /** True while the dropdown should be visible. */
  open = false;

  /** Index of the keyboard-focused result, or -1 for none. */
  focusedIndex = -1;

  @ViewChild('queryInput') queryInput!: ElementRef<HTMLInputElement>;

  private readonly query$ = new Subject<string>();
  private subscription: Subscription | null = null;

  constructor(
    private readonly globalSearchService: GlobalSearchService,
    private readonly studentHighlightService: StudentHighlightService,
    private readonly toastsService: ToastsService,
    private readonly hostElement: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.subscription = this.query$
      .pipe(debounceTime(120), distinctUntilChanged())
      .subscribe(value => this.runSearch(value));

    this.subscription.add(
      this.query.valueChanges.subscribe(value => this.query$.next(value ?? ''))
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** Click outside the search component → close the dropdown. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) return;
    if (!this.hostElement.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  /** Global keyboard shortcut: Ctrl/Cmd+K focuses the search input. */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.queryInput?.nativeElement.focus();
      this.queryInput?.nativeElement.select();
    }
  }

  /** Open the dropdown when the input gains focus and a query is present. */
  onFocus(): void {
    if (this.query.value && this.query.value.trim().length >= 2) {
      this.open = true;
    }
  }

  /** Inline keyboard handling for the input itself (arrows / enter / esc). */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (!this.results.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusedIndex = (this.focusedIndex + 1) % this.results.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusedIndex =
        (this.focusedIndex - 1 + this.results.length) % this.results.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = this.results[this.focusedIndex >= 0 ? this.focusedIndex : 0];
      if (target) this.activate(target);
    }
  }

  /** Render-side click handler. */
  activate(result: SearchResult): void {
    if (!result) return;
    const ok = this.studentHighlightService.highlight(result.studentId);
    if (!ok) {
      this.toastsService.showToast(
        `Could not locate "${result.displayName}" on the board. They may be unallocated or off-screen.`,
        'Participant search',
        false
      );
    }
    this.close();
  }

  /** Clear-button handler — also closes the dropdown. */
  clear(): void {
    this.query.setValue('');
    this.results = [];
    this.focusedIndex = -1;
    this.open = false;
    this.queryInput?.nativeElement.focus();
  }

  /** Label for the small "where the match came from" badge per result. */
  matchedFieldLabel(result: SearchResult): string {
    switch (result.matchedField) {
      case 'name':
        return 'Name';
      case 'email':
        return 'Email';
      case 'skill':
        return result.matchedValue ? `Skill · ${result.matchedValue}` : 'Skill';
    }
  }

  private runSearch(value: string): void {
    this.results = this.globalSearchService.search(value);
    this.focusedIndex = this.results.length ? 0 : -1;
    this.open = (value?.trim().length ?? 0) >= 2;
  }

  private close(): void {
    this.open = false;
    this.focusedIndex = -1;
  }
}
