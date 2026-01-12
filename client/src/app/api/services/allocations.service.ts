/* tslint:disable */
/* eslint-disable */
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base-service';
import { ApiConfiguration } from '../api-configuration';
import { StrictHttpResponse } from '../strict-http-response';

import { Allocation } from '../models/allocation';
import { teaseCoursePhaseCourseIterationIdAllocationsGet } from '../fn/allocations/tease-course-phase-course-iteration-id-allocations-get';
import { TeaseCoursePhaseCourseIterationIdAllocationsGet$Params } from '../fn/allocations/tease-course-phase-course-iteration-id-allocations-get';
import { teaseCoursePhaseCourseIterationIdAllocationsPost } from '../fn/allocations/tease-course-phase-course-iteration-id-allocations-post';
import { TeaseCoursePhaseCourseIterationIdAllocationsPost$Params } from '../fn/allocations/tease-course-phase-course-iteration-id-allocations-post';

@Injectable({ providedIn: 'root' })
export class AllocationsService extends BaseService {
  constructor(config: ApiConfiguration, http: HttpClient) {
    super(config, http);
  }

  /** Path part for operation `teaseCoursePhaseCourseIterationIdAllocationsGet()` */
  static readonly TeaseCoursePhaseCourseIterationIdAllocationsGetPath = '/tease/course_phase/{courseIterationId}/allocations';

  /**
   * Retrieve the final result of the matching/allocation.
   *
   * After the allocation is concluded, TEASE can report the results (which team each student was assigned to) to PROMPT without needing to repeat/send back all of the information that was initially sent
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teaseCoursePhaseCourseIterationIdAllocationsGet()` instead.
   *
   * This method doesn't expect any request body.
   */
  teaseCoursePhaseCourseIterationIdAllocationsGet$Response(params: TeaseCoursePhaseCourseIterationIdAllocationsGet$Params, context?: HttpContext): Observable<StrictHttpResponse<Array<Allocation>>> {
    return teaseCoursePhaseCourseIterationIdAllocationsGet(this.http, this.rootUrl, params, context);
  }

  /**
   * Retrieve the final result of the matching/allocation.
   *
   * After the allocation is concluded, TEASE can report the results (which team each student was assigned to) to PROMPT without needing to repeat/send back all of the information that was initially sent
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teaseCoursePhaseCourseIterationIdAllocationsGet$Response()` instead.
   *
   * This method doesn't expect any request body.
   */
  teaseCoursePhaseCourseIterationIdAllocationsGet(params: TeaseCoursePhaseCourseIterationIdAllocationsGet$Params, context?: HttpContext): Observable<Array<Allocation>> {
    return this.teaseCoursePhaseCourseIterationIdAllocationsGet$Response(params, context).pipe(
      map((r: StrictHttpResponse<Array<Allocation>>): Array<Allocation> => r.body)
    );
  }

  /** Path part for operation `teaseCoursePhaseCourseIterationIdAllocationsPost()` */
  static readonly TeaseCoursePhaseCourseIterationIdAllocationsPostPath = '/tease/course_phase/{courseIterationId}/allocations';

  /**
   * Submit the final result of the matching/allocation.
   *
   * After the allocation is concluded, TEASE can report the results (which team each student was assigned to) to PROMPT without needing to repeat/send back all of the information that was initially sent
   *
   * This method provides access to the full `HttpResponse`, allowing access to response headers.
   * To access only the response body, use `teaseCoursePhaseCourseIterationIdAllocationsPost()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teaseCoursePhaseCourseIterationIdAllocationsPost$Response(params: TeaseCoursePhaseCourseIterationIdAllocationsPost$Params, context?: HttpContext): Observable<StrictHttpResponse<void>> {
    return teaseCoursePhaseCourseIterationIdAllocationsPost(this.http, this.rootUrl, params, context);
  }

  /**
   * Submit the final result of the matching/allocation.
   *
   * After the allocation is concluded, TEASE can report the results (which team each student was assigned to) to PROMPT without needing to repeat/send back all of the information that was initially sent
   *
   * This method provides access only to the response body.
   * To access the full response (for headers, for example), `teaseCoursePhaseCourseIterationIdAllocationsPost$Response()` instead.
   *
   * This method sends `application/json` and handles request body of type `application/json`.
   */
  teaseCoursePhaseCourseIterationIdAllocationsPost(params: TeaseCoursePhaseCourseIterationIdAllocationsPost$Params, context?: HttpContext): Observable<void> {
    return this.teaseCoursePhaseCourseIterationIdAllocationsPost$Response(params, context).pipe(
      map((r: StrictHttpResponse<void>): void => r.body)
    );
  }

}
