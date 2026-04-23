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

/** STOMP auto-reconnect delay (ms). 0 disables reconnect. */
const RECONNECT_DELAY_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  connection: CompatClient | undefined = undefined;

  private readonly url = location.hostname;
  private readonly secure = location.protocol === 'https:';
  /** Reactive connection state — true while the STOMP socket is open. */
  private readonly connectedSubject$ = new BehaviorSubject<boolean>(false);

  /** Observable connection state for UI bindings (e.g. nav-bar indicator). */
  get connected$(): Observable<boolean> {
    return this.connectedSubject$.asObservable();
  }

  /** Synchronous accessor for the current connection state. */
  get isConnected(): boolean {
    return this.connectedSubject$.getValue();
  }

  private async connect(): Promise<boolean> {
    return new Promise(resolve => {
      if (this.connection?.connected) {
        this.connectedSubject$.next(true);
        resolve(true);
        return;
      }
      const client = Stomp.client(
        `${this.secure ? 'wss' : 'ws'}://${this.url}/ws?token=${localStorage.getItem(GLOBALS.LS_KEY_JWT)}`
      );
      // Auto-reconnect every 5 s if the underlying socket drops. Subscriptions
      // do not auto-restore — collaboration callers should listen on
      // `connected$` and re-subscribe on transitions false → true.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).reconnect_delay = RECONNECT_DELAY_MS;
      // Quiet the noisy default debug logger.
      client.debug = () => {
        /* no-op */
      };
      this.connection = client;

      const onClose = () => {
        this.connectedSubject$.next(false);
      };
      // Both legacy and new APIs expose this hook with slightly different
      // names — set both defensively.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).onWebSocketClose = onClose;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).onDisconnect = onClose;

      try {
        this.connection.connect(
          {},
          () => {
            this.connectedSubject$.next(true);
            resolve(true);
          },
          () => {
            // Connection error callback (legacy stomp.js API).
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

  /**
   * Send a STOMP message to `/app/course-iteration/{id}/{path}`.
   *
   * @returns true when the frame was handed to the STOMP client, false when
   *   the connection is not open. Callers that care about delivery (e.g.
   *   constraint / allocation broadcasts) should branch on this and surface
   *   an explicit "not synced" warning instead of treating the call as
   *   fire-and-forget.
   */
  send(courseIterationId: string, path: string, text?: string): boolean {
    if (!this.connection?.connected) {
      this.connectedSubject$.next(false);
      return false;
    }
    try {
      this.connection.send(`/app/course-iteration/${courseIterationId}/${path}`, {}, text);
      return true;
    } catch {
      // Mark disconnected so the auto-reconnect path can take over.
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
    const connected = await this.connect();
    if (!connected) {
      throw new Error('Could not connect to STOMP');
    }

    return this.connection?.subscribe(`/topic/course-iteration/${courseIterationId}/${topic}`, message => {
      onMessage(JSON.parse(message.body));
    });
  }
}
