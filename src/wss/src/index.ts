import { createServer } from "http";
import express from "express";
import WebSocket, { WebSocketServer, RawData } from "ws";

const dev = process.env.NODE_ENV === "development";
const hostname = "localhost";
const port = 4000;
const app = express();
const server = createServer(app);

interface Client {
  conn: WebSocket;
  id: string; //partyName
  clientType: string;
}

class ClientManager {
  private clients: {
    [key: string]: Array<Client>;
  } = {};

  add(partyName: string, conn: WebSocket, clientType: string): void {
    if (!this.clients[partyName]) {
      this.clients[partyName] = new Array();
    }
    const client = { conn, id: partyName, clientType } as Client;
    // Check if client already exists....
    if (!this.has(partyName, client)) {
      this.clients[partyName].push(client);
    }
  }

  has(partyName: string, newClient: Client) {
    return this.clients[partyName].some((client) => {
      return newClient.conn === client.conn;
    });
  }

  remove(partyName: string): void {
    delete this.clients[partyName];
  }

  removeClient(partyName: string, ws: WebSocket): void {
    if (this.clients[partyName]) {
      let clientIdx = -1;
      // For each client in this party, check if ws match
      this.clients[partyName].forEach((client, idx) => {
        if (client.conn == ws) {
          clientIdx = idx;
        }
      });

      if (clientIdx >= 0) {
        this.clients[partyName].splice(clientIdx, 1);
      }

      if (this.clients[partyName].length === 0) {
        this.remove(partyName);
      }
    }
  }

  getClients(partyName: string): Client[] {
    return this.clients[partyName] ? this.clients[partyName] : [];
  }

  getAllPartyNames(): string[] {
    return Object.keys(this.clients);
  }
}

const cm = new ClientManager();

const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
  console.log("Connection accepted...");

  ws.on("message", (message: RawData) => {
    const data = JSON.parse(message.toString());
    console.log("Received:", data);

    if (data.cmdType === 0) {
      cm.add(data.partyName, ws, data.clientType);
      console.log("Added new client...", data.partyName, data.clientType);
      ws.send(JSON.stringify(data)); //echo
    } else {
      console.log("Sending message to client...", data.partyName);
      const clients = cm.getClients(data.partyName);

      console.log(
        `Sending to clients for partyName: ${data.partyName} -- ${clients.length} clients`
      );
      // If command is admin command, we only want to send it to the music client, no controllers.
      // We sjhould register this information as well.

      if (clients.length > 0) {
        for (const client of clients) {
          if (client.conn !== ws) {
            // If cmd is Admmin only send down to player client type
            // Else send to everyone in party but self
            if (data.cmd == 420) {
              // Only send to the wssClient on the player device.
              if (client.clientType === "admin") {
                client.conn.send(JSON.stringify(data), (err) => {
                  if (err) {
                    console.error("Error writing json:", err, data);
                    cm.removeClient(data.partyName, client.conn);
                  }
                });
              }
            } else {
              client.conn.send(JSON.stringify(data), (err) => {
                if (err) {
                  console.error("Error writing json:", err, data);
                  cm.removeClient(data.partyName, client.conn);
                }
              });
            }
          } else {
            console.log("Not sending back to self client...");
          }
        }
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    const partyNames = cm.getAllPartyNames();
    for (const partyName of partyNames) {
      cm.removeClient(partyName, ws);
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    const partyNames = cm.getAllPartyNames();
    for (const partyName of partyNames) {
      cm.removeClient(partyName, ws);
    }
  });
});

server
  .once("error", (err) => {
    console.error(err);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
