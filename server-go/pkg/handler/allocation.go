package handler

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	corestate "github.com/ls1intum/tease/server-go/pkg/core/state"
	coresync "github.com/ls1intum/tease/server-go/pkg/core/sync"
	v1 "github.com/ls1intum/tease/server-go/pkg/gen/tease/v1"
	"github.com/ls1intum/tease/server-go/pkg/gen/tease/v1/teasev1connect"
)

// AllocationHandler implements the TeamAllocationServiceHandler interface.
type AllocationHandler struct {
	teasev1connect.UnimplementedTeamAllocationServiceHandler
	rooms   *corestate.RoomStore
	manager *coresync.StreamManager
}

// NewAllocationHandler creates a new handler with the given room store and stream manager.
func NewAllocationHandler(rooms *corestate.RoomStore, manager *coresync.StreamManager) *AllocationHandler {
	return &AllocationHandler{rooms: rooms, manager: manager}
}

// GetInitialState returns the current state of a course iteration room.
func (h *AllocationHandler) GetInitialState(
	ctx context.Context,
	req *connect.Request[v1.GetStateRequest],
) (*connect.Response[v1.GetStateResponse], error) {
	iterationID := req.Msg.CourseIterationId
	if iterationID == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("course_iteration_id required"))
	}

	room := h.rooms.GetOrCreate(iterationID)
	state := room.GetState()

	allocations := make([]*v1.Allocation, len(state.Allocations))
	for i, a := range state.Allocations {
		allocations[i] = &v1.Allocation{
			StudentId: a.StudentID,
			ProjectId: a.ProjectID,
			Version:   state.Version,
		}
	}

	resp := &v1.GetStateResponse{
		Allocations:      allocations,
		LockedStudentIds: state.Locks,
		ConstraintsJson:  state.ConstraintsJSON,
		Version:          state.Version,
	}
	return connect.NewResponse(resp), nil
}

// StreamUpdates handles the bidirectional collaboration stream.
func (h *AllocationHandler) StreamUpdates(
	ctx context.Context,
	stream *connect.BidiStream[v1.ClientUpdate, v1.ServerUpdate],
) error {
	// The first message must contain courseIterationId.
	firstMsg, err := stream.Receive()
	if err != nil {
		return err
	}
	iterationID := firstMsg.CourseIterationId
	if iterationID == "" {
		return connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("course_iteration_id required in first message"))
	}

	// Generate a unique client ID.
	clientID := fmt.Sprintf("client-%p", stream)

	// Register client with the stream manager.
	updates := h.manager.Register(iterationID, clientID)
	defer h.manager.Unregister(iterationID, clientID)

	room := h.rooms.GetOrCreate(iterationID)

	// Fan-out goroutine: drain server updates channel → send to this client.
	fanOutDone := make(chan struct{})
	go func() {
		defer close(fanOutDone)
		for {
			select {
			case update, ok := <-updates:
				if !ok {
					return
				}
				if su, ok := update.(*v1.ServerUpdate); ok {
					if sendErr := stream.Send(su); sendErr != nil {
						return
					}
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	// Process the first message (already received above).
	h.handleClientUpdate(room, iterationID, firstMsg)

	// Receive subsequent client messages.
	for {
		msg, err := stream.Receive()
		if err != nil {
			break
		}
		if conflictErr := h.handleClientUpdate(room, iterationID, msg); conflictErr != nil {
			_ = stream.Send(&v1.ServerUpdate{
				Update: &v1.ServerUpdate_Error{
					Error: &v1.ErrorUpdate{
						Message: conflictErr.Error(),
						Code:    connect.CodeOf(conflictErr).String(),
					},
				},
			})
		}
	}

	<-fanOutDone
	return nil
}

func (h *AllocationHandler) handleClientUpdate(
	room *corestate.IterationRoom,
	iterationID string,
	msg *v1.ClientUpdate,
) error {
	if req := msg.GetMoveStudent(); req != nil {
		return h.handleMoveStudent(room, iterationID, req)
	}
	if req := msg.GetLockStudent(); req != nil {
		h.handleLockStudent(room, iterationID, req)
	}
	if req := msg.GetUnlockStudent(); req != nil {
		h.handleUnlockStudent(room, iterationID, req)
	}
	if req := msg.GetUpdateConstraints(); req != nil {
		h.handleUpdateConstraints(room, iterationID, req)
	}
	return nil
}

func (h *AllocationHandler) handleMoveStudent(
	room *corestate.IterationRoom,
	iterationID string,
	req *v1.MoveStudentRequest,
) error {
	newVersion, err := room.MoveStudent(req.StudentId, req.ToProjectId, req.ExpectedVersion)
	if err != nil {
		return connect.NewError(connect.CodeAborted, err)
	}
	h.manager.BroadcastAll(iterationID, &v1.ServerUpdate{
		Update: &v1.ServerUpdate_AllocationUpdated{
			AllocationUpdated: &v1.AllocationUpdated{
				StudentId:  req.StudentId,
				ProjectId:  req.ToProjectId,
				NewVersion: newVersion,
			},
		},
	})
	return nil
}

func (h *AllocationHandler) handleLockStudent(
	room *corestate.IterationRoom,
	iterationID string,
	req *v1.LockStudentRequest,
) {
	room.LockStudent(req.StudentId)
	h.manager.BroadcastAll(iterationID, &v1.ServerUpdate{
		Update: &v1.ServerUpdate_StudentLocked{
			StudentLocked: &v1.StudentLocked{StudentId: req.StudentId},
		},
	})
}

func (h *AllocationHandler) handleUnlockStudent(
	room *corestate.IterationRoom,
	iterationID string,
	req *v1.UnlockStudentRequest,
) {
	room.UnlockStudent(req.StudentId)
	h.manager.BroadcastAll(iterationID, &v1.ServerUpdate{
		Update: &v1.ServerUpdate_StudentUnlocked{
			StudentUnlocked: &v1.StudentUnlocked{StudentId: req.StudentId},
		},
	})
}

func (h *AllocationHandler) handleUpdateConstraints(
	room *corestate.IterationRoom,
	iterationID string,
	req *v1.UpdateConstraintsRequest,
) {
	room.UpdateConstraints(req.ConstraintsJson)
	h.manager.BroadcastAll(iterationID, &v1.ServerUpdate{
		Update: &v1.ServerUpdate_ConstraintsUpdated{
			ConstraintsUpdated: &v1.ConstraintsUpdated{ConstraintsJson: req.ConstraintsJson},
		},
	})
}

// SolveAllocation is a stub; LP runs client-side.
func (h *AllocationHandler) SolveAllocation(
	ctx context.Context,
	req *connect.Request[v1.SolveRequest],
) (*connect.Response[v1.SolveResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, fmt.Errorf("LP solver runs client-side"))
}
