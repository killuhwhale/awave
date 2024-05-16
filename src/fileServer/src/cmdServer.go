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
	cm := NewClientManager()
	// defer func() {
	// 	client.conn.Close(websocket.StatusNormalClosure, "Closed...")
	// 	cs.cm.remove(data.PartyName)
	// 	log.Println("removed client... ", data.PartyName)
	// }()

	err := run(cm)
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
	clients map[string]map[*Client]bool
	lock    sync.Mutex
}

func NewClientManager() *ClientManager {
	return &ClientManager{
		clients: make(map[string]map[*Client]bool),
	}
}

func (cm ClientManager) add(partyName string, c *Client) {
	cm.lock.Lock()
	defer cm.lock.Unlock()
	if cm.clients[partyName] == nil {
		cm.clients[partyName] = make(map[*Client]bool)
	}
	cm.clients[partyName][c] = true
}

func (cm ClientManager) remove(partyName string) {
	cm.lock.Lock()
	defer cm.lock.Unlock()
	if val, exists := cm.clients[partyName]; exists {
		delete(cm.clients, partyName)
		if len(val) == 0 {
			delete(cm.clients, partyName)
		}
	}
}

func (cm ClientManager) removeClient(partyName string, conn *websocket.Conn) {
	cm.lock.Lock()
	defer cm.lock.Unlock()
	if partyClients, exists := cm.clients[partyName]; exists {

		for client := range partyClients {
			if client.conn == conn {
				delete(cm.clients["partyName"], client)
			}
		}

		if len(partyClients) == 0 {
			delete(cm.clients, partyName)
		}
	}
}

func (cm ClientManager) getClients(partyName string) []*Client {
	cm.lock.Lock()
	defer cm.lock.Unlock()

	var cl []*Client
	if clients, exists := cm.clients[partyName]; exists {
		for client := range clients {
			cl = append(cl, client)
		}
	}
	return cl
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
	fmt.Println("Connection accepted...")
	defer c.Close(websocket.StatusInternalError, "Sky is falling")

	ctx := context.Background()
	for {
		var data WSMessage
		// Read as JSON, store in v
		msgType, msg, err := c.Read(ctx)

		if err != nil {
			log.Println("Error reading message!:", err, msgType, msg)
			// Remove conn from cs.cm.remove
			cs.cm.removeClient(data.PartyName, c)
			return
		}

		if msgType < 1 || msgType > 2 {
			log.Println("bad message type:", err, msgType, msg)
			cs.cm.removeClient(data.PartyName, c)
			return
		}

		if err := json.Unmarshal(msg, &data); err != nil {
			log.Println("Error decoding JSON:", err, msgType, msg)
			cs.cm.removeClient(data.PartyName, c)
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
			// defer func() {
			// 	client.conn.Close(websocket.StatusNormalClosure, "Closed...")
			// 	cs.cm.remove(data.PartyName)
			// 	log.Println("removed client... ", data.PartyName)
			// }()

			log.Println("Added new client... ", data.PartyName)
			if err = wsjson.Write(ctx, c, data); err != nil {
				log.Printf("Error writing json at register:  %v \n\n V: %v", err, data)
			}
		} else {
			log.Println("Sending message to client... ", data.PartyName)
			clients := cs.cm.getClients(data.PartyName)
			log.Printf("Sending to clients for partyName:  %s -- %v", data.PartyName, clients)
			if len(clients) > 0 {
				// Check SecretCode
				if badCode := isBadSecretCode(data.SecretCode, data.PartyName); badCode {
					continue
				}
				for _, client := range clients {
					if client.conn != c {
						if err = wsjson.Write(ctx, client.conn, data); err != nil {
							log.Printf("Error writing json:  %v \n\n V: %v", err, data)
							continue
						}
					} else {
						fmt.Println("Not sending back to self client...")
					}
				}
			}

		}
	}

	c.Close(websocket.StatusNormalClosure, "WSS Done!")
}

func isBadSecretCode(secretCode, partyName string) bool {
	return false
}
