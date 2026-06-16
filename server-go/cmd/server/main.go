package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"connectrpc.com/connect"
	"github.com/ls1intum/tease/server-go/pkg/gen/tease/v1/teasev1connect"
	"github.com/ls1intum/tease/server-go/pkg/handler"
	corestate "github.com/ls1intum/tease/server-go/pkg/core/state"
	coresync "github.com/ls1intum/tease/server-go/pkg/core/sync"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func main() {
	addr := envOrDefault("ADDR", ":8081")

	rooms := &corestate.RoomStore{}
	manager := coresync.NewStreamManager()
	allocationHandler := handler.NewAllocationHandler(rooms, manager)

	mux := http.NewServeMux()

	// Register the Connect RPC handler.
	path, connectHandler := teasev1connect.NewTeamAllocationServiceHandler(
		allocationHandler,
		connect.WithCompressMinBytes(1024),
	)
	mux.Handle(path, corsMiddleware(connectHandler))

	// Health check.
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// h2c enables HTTP/2 without TLS (for bidirectional streaming in Docker).
	h2cHandler := h2c.NewHandler(mux, &http2.Server{})

	srv := &http.Server{
		Addr:              addr,
		Handler:           h2cHandler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("TEASE server listening on %s", addr)

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}
	log.Println("Server stopped")
}

// corsMiddleware adds CORS headers for the React dev server and PROMPT domains.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if isAllowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version, Connect-Timeout-Ms, Grpc-Timeout, X-Grpc-Web, X-User-Agent")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Expose-Headers", "Grpc-Status, Grpc-Message, Grpc-Status-Details-Bin, Connect-Protocol-Version")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func isAllowedOrigin(origin string) bool {
	if origin == "" {
		return false
	}
	allowed := []string{
		"http://localhost:3000",
		"http://localhost:5173",
		"https://prompt.ase.cit.tum.de",
		"https://prompt-temporary.ase.cit.tum.de",
	}
	for _, a := range allowed {
		if origin == a {
			return true
		}
	}
	return false
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
