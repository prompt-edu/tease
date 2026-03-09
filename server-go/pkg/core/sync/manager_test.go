package sync_test

import (
	"testing"
	"time"

	coresync "github.com/ls1intum/tease/server-go/pkg/core/sync"
)

func TestBroadcast_MultipleClients(t *testing.T) {
	mgr := coresync.NewStreamManager()

	ch1 := mgr.Register("iter-1", "client-a")
	ch2 := mgr.Register("iter-1", "client-b")
	defer mgr.Unregister("iter-1", "client-a")
	defer mgr.Unregister("iter-1", "client-b")

	msg := "hello"
	mgr.BroadcastAll("iter-1", msg)

	for _, ch := range []<-chan any{ch1, ch2} {
		select {
		case got := <-ch:
			if got != msg {
				t.Errorf("got %v, want %v", got, msg)
			}
		case <-time.After(100 * time.Millisecond):
			t.Error("timeout waiting for message")
		}
	}
}

func TestBroadcast_ExcludesSender(t *testing.T) {
	mgr := coresync.NewStreamManager()

	ch1 := mgr.Register("iter-1", "sender")
	ch2 := mgr.Register("iter-1", "receiver")
	defer mgr.Unregister("iter-1", "sender")
	defer mgr.Unregister("iter-1", "receiver")

	mgr.Broadcast("iter-1", "sender", "update")

	// ch1 (sender) should not receive.
	select {
	case <-ch1:
		t.Error("sender should not receive its own broadcast")
	case <-time.After(50 * time.Millisecond):
	}

	// ch2 (receiver) should receive.
	select {
	case got := <-ch2:
		if got != "update" {
			t.Errorf("got %v, want update", got)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("receiver did not get broadcast")
	}
}

func TestUnregister_ClosesChannel(t *testing.T) {
	mgr := coresync.NewStreamManager()
	ch := mgr.Register("iter-1", "c1")
	mgr.Unregister("iter-1", "c1")

	select {
	case _, ok := <-ch:
		if ok {
			t.Error("expected closed channel")
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("channel not closed after unregister")
	}
}
