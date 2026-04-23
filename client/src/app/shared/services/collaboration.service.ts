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
import { Subscription, distinctUntilChanged, pairwise, startWith } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CollaborationService implements OnDestroy {
  private discoverySubscription?: StompSubscription;
  private subscriptions: StompSubscription[] = [];
  /** Tracks the last known connection state so we can warn on transitions. */
  private connectionWatchSub: Subscription | null = null;
  /** Course iteration we last subscribed to — needed to re-subscribe on reconnect. */
  private activeCourseIterationId: string | null = null;

  constructor(
    private websocketService: WebsocketService,
    private overlayService: OverlayService,
    private allocationsService: AllocationsService,
    private constraintsService: ConstraintsService,
    private lockedStudentsService: LockedStudentsService,
    private toatsService: ToastsService
  ) {}

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions || []) {
      subscription.unsubscribe();
    }
    this.discoverySubscription?.unsubscribe();
    this.connectionWatchSub?.unsubscribe();
  }

  private async discover(courseIterationId: string): Promise<CollaborationData> {
    return new Promise<CollaborationData>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.toatsService.showToast('Login to PROMPT', 'Collaboration Failed', false);
        reject(new Error('Timeout waiting for message'));
      }, 3000);

      this.websocketService
        .subscribe(courseIterationId, GLOBALS.WS_TOPIC_DISCOVERY, collaborationData => {
          clearTimeout(timeout);
          this.discoverySubscription?.unsubscribe();
          resolve(collaborationData);
        })
        .then(subscription => {
          this.discoverySubscription = subscription;
          this.websocketService.send(courseIterationId, GLOBALS.WS_TOPIC_DISCOVERY);
        })
        .catch(error => {
          clearTimeout(timeout);
          this.toatsService.showToast('Login to PROMPT', 'Collaboration Failed', false);
          reject(error);
        });
    });
  }

  private async subscribe(courseIterationId: string): Promise<void> {
    this.activeCourseIterationId = courseIterationId;
    await this.subscribeToAllocations(courseIterationId);
    await this.subscribeToLockedStudents(courseIterationId);
    await this.subscribeToConstraints(courseIterationId);
    this.startConnectionWatch();
    this.toatsService.showToast('Connected to Collaboration', 'Success', true);
  }

  /**
   * Watch the underlying STOMP connection and react to lifecycle changes.
   * On a true → false transition we warn the user (silent send drops are
   * the worst-case for collaboration UX). On false → true (auto-reconnect
   * succeeded), we re-establish topic subscriptions and re-broadcast our
   * current state so peers stay in sync.
   */
  private startConnectionWatch(): void {
    if (this.connectionWatchSub) return;
    this.connectionWatchSub = this.websocketService.connected$
      .pipe(distinctUntilChanged(), startWith(true), pairwise())
      .subscribe(([prev, curr]) => {
        if (prev && !curr) {
          this.toatsService.showToast(
            'Lost connection to collaboration. Edits may not sync until reconnected.',
            'Collaboration offline',
            false
          );
        } else if (!prev && curr && this.activeCourseIterationId) {
          // Auto-reconnect succeeded — rebind the subscriptions because the
          // STOMP CompatClient does not preserve them across reconnects.
          void this.rebindAfterReconnect(this.activeCourseIterationId);
        }
      });
  }

  /** Rebuild topic subscriptions and push our current state after a reconnect. */
  private async rebindAfterReconnect(courseIterationId: string): Promise<void> {
    for (const sub of this.subscriptions) sub.unsubscribe();
    this.subscriptions = [];
    try {
      await this.subscribeToAllocations(courseIterationId);
      await this.subscribeToLockedStudents(courseIterationId);
      await this.subscribeToConstraints(courseIterationId);
      this.toatsService.showToast('Reconnected to collaboration.', 'Collaboration', true);
    } catch {
      this.toatsService.showToast(
        'Could not re-subscribe after reconnect. Please reconnect manually.',
        'Collaboration',
        false
      );
    }
  }

  async connect(courseIterationId: string): Promise<void> {
    if (!courseIterationId) {
      return;
    }
    const serverCollaborationData = await this.discover(courseIterationId);
    if (!serverCollaborationData || !serverCollaborationData.allocations) {
      this.subscribe(courseIterationId);
      return;
    }

    if (
      this.allocationsService.equalsCurrentAllocations(serverCollaborationData.allocations) &&
      this.constraintsService.equalsCurrentConstraints(serverCollaborationData.constraints) &&
      this.lockedStudentsService.equalsCurrentLockedStudentsUsingKeyValuePair(serverCollaborationData.lockedStudents)
    ) {
      this.subscribe(courseIterationId);
      return;
    }

    const overlayData = {
      title: 'Connected to Collaboration Service',
      description:
        'The Collaboration Service has a different allocations and constraints state available. Do you want to load it? This will overwrite your current allocations, constraints and locked students. Not loading it will overwrite the other data. Be careful, this action cannot be undone.',
      primaryText: 'Use Collaboration Data',
      primaryButtonStyle: 'btn-secondary',
      primaryAction: async () => {
        const serverCollaborationData = await this.discover(courseIterationId);
        this.allocationsService.setAllocations(serverCollaborationData.allocations, false);
        this.constraintsService.setConstraints(serverCollaborationData.constraints, false);
        this.lockedStudentsService.setLocksAsArray(serverCollaborationData.lockedStudents, false);
        await this.subscribe(courseIterationId);
        this.overlayService.closeOverlay();
      },
      secondaryText: 'Overwrite Collaboration Data',
      secondaryButtonStyle: 'btn-warn',
      secondaryAction: async () => {
        await this.subscribe(courseIterationId);
        this.overlayService.closeOverlay();
      },
      isDismissable: false,
    };

    this.overlayService.displayComponent(ConfirmationOverlayComponent, overlayData);
  }

  async disconnect(): Promise<void> {
    this.discoverySubscription?.unsubscribe();
    for (const subscription of this.subscriptions || []) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
    this.connectionWatchSub?.unsubscribe();
    this.connectionWatchSub = null;
    this.activeCourseIterationId = null;

    this.websocketService.connection?.disconnect();
  }

  private async subscribeToAllocations(courseIterationId: string): Promise<void> {
    this.websocketService.send(
      courseIterationId,
      GLOBALS.WS_TOPIC_ALLOCATIONS,
      this.allocationsService.getAllocationsAsString()
    );

    this.subscriptions.push(
      await this.websocketService.subscribe(courseIterationId, GLOBALS.WS_TOPIC_ALLOCATIONS, allocations => {
        console.log('Received allocations');
        this.allocationsService.setAllocations(allocations, false);
      })
    );
  }

  private async subscribeToLockedStudents(courseIterationId: string): Promise<void> {
    this.websocketService.send(
      courseIterationId,
      GLOBALS.WS_TOPIC_LOCKED_STUDENTS,
      this.lockedStudentsService.getLocksAsString()
    );

    this.subscriptions.push(
      await this.websocketService.subscribe(courseIterationId, GLOBALS.WS_TOPIC_LOCKED_STUDENTS, lockedStudents => {
        this.lockedStudentsService.setLocksAsArray(lockedStudents, false);
      })
    );
  }

  private async subscribeToConstraints(courseIterationId: string): Promise<void> {
    this.websocketService.send(
      courseIterationId,
      GLOBALS.WS_TOPIC_CONSTRAINTS,
      this.constraintsService.getConstraintsAsString()
    );

    this.subscriptions.push(
      await this.websocketService.subscribe(courseIterationId, GLOBALS.WS_TOPIC_CONSTRAINTS, constraints => {
        this.constraintsService.setConstraints(constraints, false);
      })
    );
  }
}
