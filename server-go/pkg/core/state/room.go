package state

import (
	"fmt"
	"sync"
	"sync/atomic"
)

// Allocation maps a student to a project.
type Allocation struct {
	StudentID string
	ProjectID string // empty = unallocated
}

// RoomState is a snapshot of an IterationRoom for reading.
type RoomState struct {
	Allocations     []Allocation
	Locks           []string // locked student IDs
	ConstraintsJSON []byte
	Version         int64
}

// IterationRoom holds the collaborative state for a single course iteration.
// All mutation methods are safe for concurrent use.
type IterationRoom struct {
	mu          sync.RWMutex
	allocations map[string]string // studentID → projectID (empty = unallocated)
	locks       map[string]struct{}
	constraints []byte
	version     int64
}

func newIterationRoom() *IterationRoom {
	return &IterationRoom{
		allocations: make(map[string]string),
		locks:       make(map[string]struct{}),
	}
}

// MoveStudent atomically moves a student if expectedVersion matches.
// Returns (newVersion, nil) on success or (0, error) on conflict/lock.
func (r *IterationRoom) MoveStudent(studentID, toProjectID string, expectedVersion int64) (int64, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.version != expectedVersion {
		return 0, fmt.Errorf("VERSION_CONFLICT: expected %d got %d", expectedVersion, r.version)
	}
	if _, locked := r.locks[studentID]; locked {
		return 0, fmt.Errorf("STUDENT_LOCKED: student %s is locked", studentID)
	}

	r.version++
	r.allocations[studentID] = toProjectID
	return r.version, nil
}

// LockStudent locks a student.
func (r *IterationRoom) LockStudent(studentID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.locks[studentID] = struct{}{}
}

// UnlockStudent unlocks a student.
func (r *IterationRoom) UnlockStudent(studentID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.locks, studentID)
}

// UpdateConstraints stores opaque JSON constraints.
func (r *IterationRoom) UpdateConstraints(jsonBytes []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.constraints = jsonBytes
}

// GetState returns a consistent snapshot of the room.
func (r *IterationRoom) GetState() RoomState {
	r.mu.RLock()
	defer r.mu.RUnlock()

	allocs := make([]Allocation, 0, len(r.allocations))
	for studentID, projectID := range r.allocations {
		allocs = append(allocs, Allocation{StudentID: studentID, ProjectID: projectID})
	}

	locks := make([]string, 0, len(r.locks))
	for id := range r.locks {
		locks = append(locks, id)
	}

	var constraints []byte
	if r.constraints != nil {
		constraints = append([]byte{}, r.constraints...)
	}

	return RoomState{
		Allocations:     allocs,
		Locks:           locks,
		ConstraintsJSON: constraints,
		Version:         r.version,
	}
}

// Version returns the current version atomically.
func (r *IterationRoom) Version() int64 {
	return atomic.LoadInt64(&r.version)
}
