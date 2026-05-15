import { Injectable, OnDestroy } from '@angular/core';
import { CollaborationData, WebsocketService } from '../network/websocket.service';
import { OverlayService } from 'src/app/overlay.service';
import { AllocationsService } from '../data/allocations.service';
import { ConstraintsService } from '../data/constraints.service';
import { LockedStudentsService } from '../data/locked-students.service';
import { StompSubscription } from '@stomp/stompjs';
import { ConfirmationOverlayComponent } from 'src/app/components/confirmation-overlay/confirmation-overlay.component';
import { GLOBALS } from '../utils/constants';
import { ToastsService } from './toasts.service';

const DISCOVERY_TIMEOUT_MS = 3000;

@Injectable({ providedIn: 'root' })
export class CollaborationService implements OnDestroy {
  private discoverySubscription?: StompSubscription;
  private subscriptions: StompSubscription[] = [];

  constructor(
    private websocketService: WebsocketService,
    private overlayService: OverlayService,
    private allocationsService: AllocationsService,
    private constraintsService: ConstraintsService,
    private lockedStudentsService: LockedStudentsService,
    private toastsService: ToastsService
  ) {}

  ngOnDestroy(): void {
    this.disconnect();
  }

  async connect(courseIterationId: string): Promise<void> {
    if (!courseIterationId) return;
    const remote = await this.discover(courseIterationId);
    if (!remote?.allocations) {
      await this.subscribeAll(courseIterationId);
      return;
    }
    if (this.matchesLocalState(remote)) {
      await this.subscribeAll(courseIterationId);
      return;
    }

    this.overlayService.displayComponent(ConfirmationOverlayComponent, {
      title: 'Connected to Collaboration Service',
      description:
        'The Collaboration Service has a different state available. Loading it will overwrite your current allocations, constraints and locked students. Not loading it will overwrite the remote data. This action cannot be undone.',
      primaryText: 'Use Collaboration Data',
      primaryButtonClass: 'btn-secondary',
      primaryAction: async () => {
        const fresh = await this.discover(courseIterationId);
        this.allocationsService.setAllocations(fresh.allocations, false);
        this.constraintsService.setConstraints(fresh.constraints, false);
        this.lockedStudentsService.setLocksAsArray(fresh.lockedStudents, false);
        await this.subscribeAll(courseIterationId);
        this.overlayService.closeOverlay();
      },
      secondaryText: 'Overwrite Collaboration Data',
      secondaryButtonStyle: 'btn-warn',
      secondaryAction: async () => {
        await this.subscribeAll(courseIterationId);
        this.overlayService.closeOverlay();
      },
      isDismissable: false,
    });
  }

  async disconnect(): Promise<void> {
    this.discoverySubscription?.unsubscribe();
    this.discoverySubscription = undefined;
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
    this.websocketService.connection?.disconnect();
  }

  private discover(courseIterationId: string): Promise<CollaborationData> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.toastsService.showToast('Login to PROMPT', 'Collaboration Failed', false);
        reject(new Error('Timeout waiting for collaboration handshake'));
      }, DISCOVERY_TIMEOUT_MS);

      this.websocketService
        .subscribe(courseIterationId, GLOBALS.WS_TOPIC_DISCOVERY, data => {
          clearTimeout(timeout);
          this.discoverySubscription?.unsubscribe();
          resolve(data);
        })
        .then(sub => {
          this.discoverySubscription = sub;
          this.websocketService.send(courseIterationId, GLOBALS.WS_TOPIC_DISCOVERY);
        })
        .catch(err => {
          clearTimeout(timeout);
          this.toastsService.showToast('Login to PROMPT', 'Collaboration Failed', false);
          reject(err);
        });
    });
  }

  private matchesLocalState(remote: CollaborationData): boolean {
    return (
      this.allocationsService.equalsCurrentAllocations(remote.allocations) &&
      this.constraintsService.equalsCurrentConstraints(remote.constraints) &&
      this.lockedStudentsService.equalsCurrentLockedStudentsUsingKeyValuePair(remote.lockedStudents)
    );
  }

  private async subscribeAll(courseIterationId: string): Promise<void> {
    await Promise.all([
      this.bindTopic(courseIterationId, GLOBALS.WS_TOPIC_ALLOCATIONS, this.allocationsService.getAllocationsAsString(), data =>
        this.allocationsService.setAllocations(data, false)
      ),
      this.bindTopic(courseIterationId, GLOBALS.WS_TOPIC_LOCKED_STUDENTS, this.lockedStudentsService.getLocksAsString(), data =>
        this.lockedStudentsService.setLocksAsArray(data, false)
      ),
      this.bindTopic(courseIterationId, GLOBALS.WS_TOPIC_CONSTRAINTS, this.constraintsService.getConstraintsAsString(), data =>
        this.constraintsService.setConstraints(data, false)
      ),
    ]);
    this.toastsService.showToast('Connected to Collaboration', 'Success', true);
  }

  private async bindTopic(
    courseIterationId: string,
    topic: string,
    snapshot: string,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    onMessage: (data: any) => void
  ): Promise<void> {
    this.websocketService.send(courseIterationId, topic, snapshot);
    this.subscriptions.push(await this.websocketService.subscribe(courseIterationId, topic, onMessage));
  }
}
