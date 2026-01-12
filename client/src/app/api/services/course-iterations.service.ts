/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { CourseIteration } from '../models/course-iteration';
import { teaseCoursePhasesGet } from '../fn/course-iterations/tease-course-phases-get';
import { TeaseCoursePhasesGet$Params } from '../fn/course-iterations/tease-course-phases-get';

@Injectable({ providedIn: 'root' })
export class CourseIterationsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `teaseCoursePhasesGet()` */
  static readonly TeaseCoursePhasesGetPath = '/tease/course-phases';

  /**
   * Retrieve all course iterations.
   *
   *
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teaseCoursePhasesGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  teaseCoursePhasesGet$Response(params?: TeaseCoursePhasesGet$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<CourseIteration>>> {
    return teaseCoursePhasesGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Retrieve all course iterations.
   *
   *
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teaseCoursePhasesGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teaseCoursePhasesGet(params?: TeaseCoursePhasesGet$Params, context?: HttpContext): Observable<Array<CourseIteration>> {
    return this.teaseCoursePhasesGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<CourseIteration>>): Array<CourseIteration> => r.body)
    );
  }

}
