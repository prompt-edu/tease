import { Injectable } from '@angular/core';
import { StudentsService } from '../data/students.service';
import { SkillsService } from '../data/skills.service';
import { AllocationsService } from '../data/allocations.service';
import { ProjectsService } from '../data/projects.service';

/** What field of a participant a search query matched on. */
export type SearchMatchField = 'name' | 'email' | 'skill';

/** A single global-search hit, ready to render in the results dropdown. */
export interface SearchResult {
  /** Student id — used to scroll-to / highlight on the board. */
  studentId: string;
  /** "First Last" for display. */
  displayName: string;
  /** Email address for the secondary line. */
  email: string;
  /** Project / team name the student is currently in, or null if unallocated. */
  teamName: string | null;
  /** Which student attribute the query matched on (drives the badge label). */
  matchedField: SearchMatchField;
  /** Optional context string (e.g. the matched skill title). */
  matchedValue?: string;
  /** Internal score used to rank results; higher is better. */
  score: number;
}

/**
 * Cross-board participant search.
 *
 * Scope (intentionally narrow — see PR description for rationale):
 *   - First name, last name, full name (substring, case-insensitive).
 *   - Email (substring, case-insensitive).
 *   - Skill title — matches anyone who has a skill whose title contains
 *     the query (e.g. "docker", "swift").
 *
 * Other attributes (gender, nationality, language, devices) are filter
 * concepts and live in the constraint builder, not the global search.
 */
@Injectable({
  providedIn: 'root',
})
export class GlobalSearchService {
  /** Max number of results returned to the dropdown. */
  static readonly MAX_RESULTS = 10;
  /** Minimum query length before a search runs. */
  static readonly MIN_QUERY_LENGTH = 2;

  constructor(
    private studentsService: StudentsService,
    private skillsService: SkillsService,
    private allocationsService: AllocationsService,
    private projectsService: ProjectsService
  ) {}

  /**
   * Run a case-insensitive search across the loaded participant list.
   * Returns up to {@link MAX_RESULTS} matches ranked by relevance.
   */
  search(rawQuery: string): SearchResult[] {
    const query = rawQuery?.trim().toLowerCase() ?? '';
    if (query.length < GlobalSearchService.MIN_QUERY_LENGTH) return [];

    const students = this.studentsService.getStudents() ?? [];
    if (!students.length) return [];

    const skillIndex = new Map(
      (this.skillsService.getSkills() ?? []).map(skill => [skill.id, skill])
    );
    const teamLookup = this.buildStudentToTeamLookup();

    const results: SearchResult[] = [];

    for (const student of students) {
      const fullName = `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim();
      const fullNameLower = fullName.toLowerCase();
      const emailLower = (student.email ?? '').toLowerCase();

      // Name matches outrank email/skill matches.
      if (fullNameLower.includes(query)) {
        const score = this.nameScore(fullNameLower, query);
        results.push(this.toResult(student.id, fullName, student.email, teamLookup, 'name', undefined, score));
        continue;
      }

      if (emailLower && emailLower.includes(query)) {
        // Prefix matches on the email's local-part rank slightly higher.
        const score = emailLower.startsWith(query) ? 70 : 60;
        results.push(this.toResult(student.id, fullName, student.email, teamLookup, 'email', undefined, score));
        continue;
      }

      const matchedSkill = (student.skills ?? [])
        .map(s => skillIndex.get(s.id))
        .find(skill => skill && skill.title?.toLowerCase().includes(query));
      if (matchedSkill) {
        results.push(
          this.toResult(student.id, fullName, student.email, teamLookup, 'skill', matchedSkill.title, 50)
        );
      }
    }

    return results
      .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName))
      .slice(0, GlobalSearchService.MAX_RESULTS);
  }

  /** Build a `studentId → teamName` lookup from the current allocation state. */
  private buildStudentToTeamLookup(): Map<string, string> {
    const lookup = new Map<string, string>();
    for (const allocation of this.allocationsService.getAllocations() ?? []) {
      const teamName = this.projectsService.getProjectNameById(allocation.projectId);
      for (const studentId of allocation.students ?? []) {
        lookup.set(studentId, teamName);
      }
    }
    return lookup;
  }

  private nameScore(fullNameLower: string, query: string): number {
    if (fullNameLower === query) return 200;
    if (fullNameLower.startsWith(query)) return 150;
    // Word-boundary match (e.g. matches the start of last name).
    if (new RegExp(`\\b${this.escapeRegex(query)}`).test(fullNameLower)) return 120;
    return 100;
  }

  private toResult(
    studentId: string,
    displayName: string,
    email: string,
    teamLookup: Map<string, string>,
    matchedField: SearchMatchField,
    matchedValue: string | undefined,
    score: number
  ): SearchResult {
    return {
      studentId,
      displayName,
      email,
      teamName: teamLookup.get(studentId) ?? null,
      matchedField,
      matchedValue,
      score,
    };
  }

  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
