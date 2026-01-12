import { Injectable } from '@angular/core';
import { CompatClient, Stomp } from '@stomp/stompjs';
import { StompSubscription } from '@stomp/stompjs/src/stomp-subscription';
import { Allocation } from 'src/app/api/models';
import { ConstraintWrapper } from '../matching/constraints/constraint';
import { GLOBALS } from '../utils/constants';

export interface CollaborationData {
  allocations: Allocation[];
  constraints: ConstraintWrapper[];
  lockedStudents: [string, string][];
}
@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  connection: CompatClient | undefined = undefined;

  private readonly url = location.hostname;
  private readonly secure = location.protocol === 'https:';

  constructor() {}

  private async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.connection?.connected) {
        resolve(true);
        return;
      }
      this.connection = Stomp.client(
        `${this.secure ? 'wss' : 'ws'}://${this.url}/ws?token=${localStorage.getItem(GLOBALS.LS_KEY_JWT)}`
      );

      try {
        this.connection.connect({}, () => {
          resolve(true);
        });
      } catch (error) {
        reject(false);
      }
    });
  }

  async send(courseIterationId: string, path: string, text?: string): Promise<void> {
    if (!this.connection?.connected) {
      return;
    }
    this.connection.send(`/app/course-iteration/${courseIterationId}/${path}`, {}, text);
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
