/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeaseSaveRequest, TeaseWorkspace } from '../../models/tease-workspace';

export interface TeaseCoursePhaseCoursePhaseIdSavePost$Params {
  /**
   * Unique identifier of the course phase
   */
  coursePhaseId: string;
  body?: TeaseSaveRequest;
}

/**
 * Publish the Tease workspace + finalised allocations to PROMPT in a single
 * atomic transaction via `POST /tease/course_phase/{coursePhaseId}/save`.
 * Returns the server-stamped workspace (with updated `lastExportedAt`).
 */
export function teaseCoursePhaseCoursePhaseIdSavePost(
  http: HttpClient,
  rootUrl: string,
  params: TeaseCoursePhaseCoursePhaseIdSavePost$Params,
  context?: HttpContext
): Observable<StrictHttpResponse<TeaseWorkspace>> {
  const rb = new RequestBuilder(rootUrl, teaseCoursePhaseCoursePhaseIdSavePost.PATH, 'post');
  if (params) {
    rb.path('coursePhaseId', params.coursePhaseId, {});
    rb.body(params.body, 'application/json');
  }

  return http.request(rb.build({ responseType: 'json', accept: 'application/json', context })).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<TeaseWorkspace>;
    })
  );
}

teaseCoursePhaseCoursePhaseIdSavePost.PATH = '/tease/course_phase/{coursePhaseId}/save';
