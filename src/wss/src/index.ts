import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";

interface Client {
  conn: WebSocket;
  id: string;
}

class ClientManager {
  private clients: { [key: string]: Set<WebSocket> } = {};

  add(partyName: string, client: WebSocket): void {
    if (!this.clients[partyName]) {
      this.clients[partyName] = new Set();
    }
    this.clients[partyName].add(client);
  }

  remove(partyName: string): void {
    delete this.clients[partyName];
  }

  removeClient(partyName: string, ws: WebSocket): void {
    if (this.clients[partyName]) {
      this.clients[partyName].delete(ws);
      if (this.clients[partyName].size === 0) {
        this.remove(partyName);
      }
    }
  }

  getClients(partyName: string): WebSocket[] {
    return this.clients[partyName] ? Array.from(this.clients[partyName]) : [];
  }

  getAllPartyNames(): string[] {
    return Object.keys(this.clients);
  }
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const cm = new ClientManager();

wss.on("connection", (ws: WebSocket) => {
  console.log("Connection accepted...");

  ws.on("message", (message: WebSocket.RawData) => {
    const data = JSON.parse(message.toString());
    console.log("Received:", data);

    if (data.cmdType === 0) {
      const client: Client = { conn: ws, id: data.partyName };
      cm.add(data.partyName, ws);
      console.log("Added new client...", data.partyName);

      ws.send(JSON.stringify(data));
    } else {
      console.log("Sending message to client...", data.partyName);
      const clients = cm.getClients(data.partyName);
      console.log(
        `Sending to clients for partyName: ${data.partyName} -- ${clients.length} clients`
      );

      if (clients.length > 0) {
        for (const client of clients) {
          if (client !== ws) {
            client.send(JSON.stringify(data), (err) => {
              if (err) {
                console.error("Error writing json:", err, data);
                cm.removeClient(data.partyName, client);
              }
            });
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

const PORT = process.argv[2] || 4000;
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

app.use(express.static(path.join(__dirname, "public")));
