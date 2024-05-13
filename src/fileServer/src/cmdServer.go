package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"log"

	// "net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"time"

	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"
)

func main() {
	fmt.Println("Test command server")
	cm := ClientManager{
		clients: make(map[string]*Client),
	}

	err := run(&cm)
	if err != nil {
		log.Fatal(err)
	}
}

func run(cm *ClientManager) error {
	if len(os.Args) < 2 {
		return errors.New("please provide IP addr to listen on")
	}

	// l, err := net.Listen("tcp", os.Args[1])
	// if err != nil {
	// 	return err
	// }
	// fmt.Println("Listening on: ", l.Addr())

	// Setup TLS configuration
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}
	mux := http.NewServeMux()

	mux.Handle("/webrtcwss/", commandServer{logf: log.Printf, cm: *cm})

	s := &http.Server{
		Handler:      mux,
		TLSConfig:    tlsConfig,
		ReadTimeout:  time.Second * 10,
		WriteTimeout: time.Second * 10,
		Addr:         os.Args[1],
	}

	errc := make(chan error, 1)
	go func() {
		err := s.ListenAndServeTLS("cert.pem", "key.pem")
		if err != nil {
			log.Fatal("ListenAndServeTLS: ", err)
		}
		// errc <- s.Serve(l)
	}()

	fmt.Println("Listening on ", os.Args[1])

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, os.Interrupt)

	select {
	case err := <-errc:
		fmt.Printf("Failed serving: %v", err)
	case sig := <-sigs:
		fmt.Printf("Terminating: %v", sig)
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()
	return s.Shutdown(ctx)
}

type Client struct {
	conn *websocket.Conn
	id   string
}

type ClientManager struct {
	clients map[string]*Client
	lock    sync.Mutex
}

func (cm ClientManager) add(partyName string, c *Client) {
	cm.lock.Lock()
	defer cm.lock.Unlock()
	cm.clients[partyName] = c
}

func (cm ClientManager) remove(partyName string) {
	cm.lock.Lock()
	defer cm.lock.Unlock()
	delete(cm.clients, partyName)
}

type commandServer struct {
	logf func(f string, v ...interface{})
	cm   ClientManager
}

type RTCSessionDescription struct {
	Type string `json:"type"`
	SDP  string `json:"sdp"`
}

type WSMessage struct {
	Cmd        int                    `json:"cmd"`
	CmdType    int                    `json:"cmdType"`
	PartyName  string                 `json:"partyName"`
	SecretCode string                 `json:"secretCode"`
	Setlist    int                    `json:"setlist"`
	VolAmount  int                    `json:"volAmount"`
	RTCType    *string                `json:"rtcType"`
	Candidate  *string                `json:"candidate"`
	Answer     *RTCSessionDescription `json:"answer"`
	Offer      *RTCSessionDescription `json:"offer"`
}

func (cs commandServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Println("ServeHTTP...")
	// Upgrade to ws protocol
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		Subprotocols:   []string{"echo"},
		OriginPatterns: []string{"*"},
	})

	if err != nil {
		log.Println("Error accepting connection: ", err)
		return
	}

	defer c.Close(websocket.StatusInternalError, "Sky is falling")

	ctx := context.Background()
	for {
		var data WSMessage
		// Read as JSON, store in v
		msgType, msg, err := c.Read(ctx)

		if err != nil {
			log.Println("Error reading message:", err)
			return
		}

		if msgType < 1 || msgType > 2 {
			log.Println("bad message type:", err)
			return
		}

		if err := json.Unmarshal(msg, &data); err != nil {
			log.Println("Error decoding JSON:", err)
			return
		}

		// err = wsjson.Read(ctx, c, &data)

		// if err != nil {
		// 	log.Println("Error reading json: ", err, msgType, msg)
		// 	break
		// }

		log.Printf("Recv'd: %v", data)

		if data.CmdType == 0 {
			// Register client with name
			client := Client{
				conn: c,
				id:   "",
			}
			client.id = data.PartyName
			cs.cm.add(client.id, &client)
			defer func() {
				client.conn.Close(websocket.StatusNormalClosure, "Closed...")
				cs.cm.remove(data.PartyName)
				log.Println("removed client... ", data.PartyName)
			}()

			log.Println("Added new client... ", data.PartyName)
			if err = wsjson.Write(ctx, c, data); err != nil {
				log.Printf("Error writing json at register:  %v \n\n V: %v", err, data)
				break
			}
		} else {
			log.Println("Sending message to client... ", data.PartyName)
			if client_sendee, exists := cs.cm.clients[data.PartyName]; exists {
				// Check SecretCode
				if badCode := checkSecretCode(data.SecretCode, data.PartyName); badCode {
					continue
				}
				if err = wsjson.Write(ctx, client_sendee.conn, data); err != nil {
					log.Printf("Error writing json:  %v \n\n V: %v", err, data)
					break
				}
			}

		}
	}

	c.Close(websocket.StatusNormalClosure, "WSS Done!")
}

func checkSecretCode(secretCode, partyName string) bool {
	return false
}
