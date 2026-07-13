package state

import "sync"

// RoomStore manages IterationRooms keyed by courseIterationId.
// It is safe for concurrent use.
type RoomStore struct {
	rooms sync.Map // courseIterationId → *IterationRoom
}

// GetOrCreate returns the existing room for id or creates a new one.
func (s *RoomStore) GetOrCreate(id string) *IterationRoom {
	actual, _ := s.rooms.LoadOrStore(id, newIterationRoom())
	return actual.(*IterationRoom)
}

// Get returns the room for id if it exists, nil otherwise.
func (s *RoomStore) Get(id string) *IterationRoom {
	v, ok := s.rooms.Load(id)
	if !ok {
		return nil
	}
	return v.(*IterationRoom)
}
