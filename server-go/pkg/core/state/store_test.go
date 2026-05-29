package state_test

import (
	"testing"

	"github.com/ls1intum/tease/server-go/pkg/core/state"
)

func TestGetOrCreate_IsolatedRooms(t *testing.T) {
	store := &state.RoomStore{}

	r1 := store.GetOrCreate("room-1")
	r2 := store.GetOrCreate("room-2")

	if r1 == r2 {
		t.Fatal("expected different room instances")
	}

	r1.LockStudent("student-a")
	st2 := r2.GetState()
	if len(st2.Locks) != 0 {
		t.Errorf("room-2 should be unaffected by room-1 lock: %v", st2.Locks)
	}
}

func TestGetOrCreate_Idempotent(t *testing.T) {
	store := &state.RoomStore{}
	r1 := store.GetOrCreate("room-x")
	r2 := store.GetOrCreate("room-x")
	if r1 != r2 {
		t.Fatal("expected same room instance for same id")
	}
}
