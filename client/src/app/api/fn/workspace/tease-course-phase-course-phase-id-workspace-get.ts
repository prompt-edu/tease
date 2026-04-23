/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeaseWorkspace } from '../../models/tease-workspace';

export interface TeaseCoursePhaseCoursePhaseIdWorkspaceGet$Params {
  /**
   * Unique identifier of the course phase
   */
  coursePhaseId: string;
}

/**
 * Fetch the persisted Tease workspace for a course phase via
 * `GET /tease/course_phase/{coursePhaseId}/workspace`. Returns an empty
 * default workspace when the course phase has no saved state yet.
 */
export function teaseCoursePhaseCoursePhaseIdWorkspaceGet(
  http: HttpClient,
  rootUrl: string,
  params: TeaseCoursePhaseCoursePhaseIdWorkspaceGet$Params,
  context?: HttpContext
): Observable<StrictHttpResponse<TeaseWorkspace>> {
  const rb = new RequestBuilder(rootUrl, teaseCoursePhaseCoursePhaseIdWorkspaceGet.PATH, 'get');
  if (params) {
    rb.path('coursePhaseId', params.coursePhaseId, {});
  }

  return http.request(rb.build({ responseType: 'json', accept: 'application/json', context })).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<TeaseWorkspace>;
    })
  );
}

teaseCoursePhaseCoursePhaseIdWorkspaceGet.PATH = '/tease/course_phase/{coursePhaseId}/workspace';
