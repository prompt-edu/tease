import { Injectable } from '@angular/core';
import { CompatClient, Stomp, StompSubscription } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { Allocation } from 'src/app/api/models';
import { ConstraintWrapper } from '../matching/constraints/constraint';
import { GLOBALS } from '../utils/constants';

/** Snapshot of a peer's collaboration state, returned via the discovery topic. */
export interface CollaborationData {
  allocations: Allocation[];
  constraints: ConstraintWrapper[];
  lockedStudents: [string, string][];
}

const RECONNECT_DELAY_MS = 5000;

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  connection: CompatClient | undefined;

  private readonly connectedSubject$ = new BehaviorSubject<boolean>(false);

  get connected$(): Observable<boolean> {
    return this.connectedSubject$.asObservable();
  }

  get isConnected(): boolean {
    return this.connectedSubject$.getValue();
  }

  send(courseIterationId: string, path: string, text?: string): boolean {
    if (!this.connection?.connected) {
      this.connectedSubject$.next(false);
      return false;
    }
    try {
      this.connection.send(`/app/course-iteration/${courseIterationId}/${path}`, {}, text);
      return true;
    } catch {
      this.connectedSubject$.next(false);
      return false;
    }
  }

  async subscribe(
    courseIterationId: string,
    topic: string,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    onMessage: (data: any) => void
  ): Promise<StompSubscription> {
    if (!(await this.connect())) {
      throw new Error('Could not connect to STOMP');
    }
    return this.connection!.subscribe(`/topic/course-iteration/${courseIterationId}/${topic}`, msg =>
      onMessage(JSON.parse(msg.body))
    );
  }

  private connect(): Promise<boolean> {
    return new Promise(resolve => {
      if (this.connection?.connected) {
        this.connectedSubject$.next(true);
        resolve(true);
        return;
      }
      const secure = location.protocol === 'https:';
      const client = Stomp.client(
        `${secure ? 'wss' : 'ws'}://${location.hostname}/ws?token=${localStorage.getItem(GLOBALS.LS_KEY_JWT)}`
      );
      // Auto-reconnect the underlying socket if it drops. Subscriptions
      // are NOT auto-restored — callers must reconnect manually.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).reconnect_delay = RECONNECT_DELAY_MS;
      client.debug = () => {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).onWebSocketClose = () => this.connectedSubject$.next(false);
      this.connection = client;

      try {
        client.connect(
          {},
          () => {
            this.connectedSubject$.next(true);
            resolve(true);
          },
          () => {
            this.connectedSubject$.next(false);
            resolve(false);
          }
        );
      } catch {
        this.connectedSubject$.next(false);
        resolve(false);
      }
    });
  }
}
