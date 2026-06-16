package sync

import (
	"sync"
)

const clientChanBuffer = 64

// StreamManager tracks connected clients per course iteration.
// Each client is identified by a clientID and receives ServerUpdate values
// on a dedicated channel.
type StreamManager struct {
	mu      sync.RWMutex
	clients map[string]map[string]chan<- any // iterationID → clientID → chan
}

func NewStreamManager() *StreamManager {
	return &StreamManager{
		clients: make(map[string]map[string]chan<- any),
	}
}

// Register creates a receive-only channel for clientID in iterationID.
// The caller must call Unregister when done.
func (m *StreamManager) Register(iterationID, clientID string) <-chan any {
	ch := make(chan any, clientChanBuffer)
	m.mu.Lock()
	if m.clients[iterationID] == nil {
		m.clients[iterationID] = make(map[string]chan<- any)
	}
	m.clients[iterationID][clientID] = ch
	m.mu.Unlock()
	return ch
}

// Unregister removes the client and closes its channel.
func (m *StreamManager) Unregister(iterationID, clientID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if room, ok := m.clients[iterationID]; ok {
		if ch, ok := room[clientID]; ok {
			close(ch)
			delete(room, clientID)
		}
		if len(room) == 0 {
			delete(m.clients, iterationID)
		}
	}
}

// Broadcast sends update to all clients in iterationID except sender.
// Non-blocking: if a client's buffer is full the update is dropped for that client.
func (m *StreamManager) Broadcast(iterationID, senderID string, update any) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for id, ch := range m.clients[iterationID] {
		if id == senderID {
			continue
		}
		select {
		case ch <- update:
		default:
		}
	}
}

// BroadcastAll sends update to ALL clients in iterationID including sender.
func (m *StreamManager) BroadcastAll(iterationID string, update any) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, ch := range m.clients[iterationID] {
		select {
		case ch <- update:
		default:
		}
	}
}
