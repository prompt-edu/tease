/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { TeaseWorkspace, TeaseWorkspaceUpsert } from '../../models/tease-workspace';

export interface TeaseCoursePhaseCoursePhaseIdWorkspacePut$Params {
  /**
   * Unique identifier of the course phase
   */
  coursePhaseId: string;
  body?: TeaseWorkspaceUpsert;
}

export function teaseCoursePhaseCoursePhaseIdWorkspacePut(
  http: HttpClient,
  rootUrl: string,
  params: TeaseCoursePhaseCoursePhaseIdWorkspacePut$Params,
  context?: HttpContext
): Observable<StrictHttpResponse<TeaseWorkspace>> {
  const rb = new RequestBuilder(rootUrl, teaseCoursePhaseCoursePhaseIdWorkspacePut.PATH, 'put');
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

teaseCoursePhaseCoursePhaseIdWorkspacePut.PATH = '/tease/course_phase/{coursePhaseId}/workspace';
