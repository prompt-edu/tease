package state_test

import (
	"sync"
	"testing"

	"github.com/ls1intum/tease/server-go/pkg/core/state"
)

func newRoom() *state.IterationRoom {
	store := &state.RoomStore{}
	return store.GetOrCreate("test-room")
}

func TestMoveStudent_Basic(t *testing.T) {
	r := newRoom()
	ver, err := r.MoveStudent("s1", "p1", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ver != 1 {
		t.Fatalf("expected version 1, got %d", ver)
	}
	st := r.GetState()
	if st.Version != 1 {
		t.Errorf("state version = %d, want 1", st.Version)
	}
}

func TestMoveStudent_OCC_Conflict(t *testing.T) {
	r := newRoom()
	_, err := r.MoveStudent("s1", "p1", 0)
	if err != nil {
		t.Fatalf("first move failed: %v", err)
	}
	// Second move with stale version should fail.
	_, err = r.MoveStudent("s2", "p1", 0)
	if err == nil {
		t.Fatal("expected VERSION_CONFLICT error, got nil")
	}
}

func TestMoveStudent_LockedStudent(t *testing.T) {
	r := newRoom()
	r.LockStudent("s1")
	_, err := r.MoveStudent("s1", "p1", 0)
	if err == nil {
		t.Fatal("expected STUDENT_LOCKED error, got nil")
	}
}

func TestLockUnlock(t *testing.T) {
	r := newRoom()
	r.LockStudent("s1")
	st := r.GetState()
	if len(st.Locks) != 1 || st.Locks[0] != "s1" {
		t.Errorf("expected s1 locked, got %v", st.Locks)
	}
	r.UnlockStudent("s1")
	st = r.GetState()
	if len(st.Locks) != 0 {
		t.Errorf("expected no locks, got %v", st.Locks)
	}
}

func TestUpdateConstraints(t *testing.T) {
	r := newRoom()
	payload := []byte(`[{"id":"c1"}]`)
	r.UpdateConstraints(payload)
	st := r.GetState()
	if string(st.ConstraintsJSON) != string(payload) {
		t.Errorf("constraints mismatch: %s", st.ConstraintsJSON)
	}
}

func TestMoveStudent_Concurrent(t *testing.T) {
	r := newRoom()
	const n = 50
	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		success int
	)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			st := r.GetState()
			sid := "s" + string(rune('0'+i%10))
			_, err := r.MoveStudent(sid, "p1", st.Version)
			if err == nil {
				mu.Lock()
				success++
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()
	// At most n moves can succeed (one per unique version).
	// The key assertion is no panics or data races (run with -race).
	if success == 0 {
		t.Error("expected at least one successful move")
	}
}
