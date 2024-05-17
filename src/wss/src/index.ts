import { createServer } from "http";
import { parse } from "url";
import express from "express";
import WebSocket, { WebSocketServer, RawData } from "ws";

const dev = process.env.NODE_ENV === "development";
const hostname = "localhost";
const port = 4000;
// const app = next({ dev, hostname, port });
const app = express();
const server = createServer(app);

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

const cm = new ClientManager();

// Create a message to send.
const ping = (msg: string, data: any) => {
  return JSON.stringify({ msg, data });
};

// parseJson
const pj = (s: string) => {
  return JSON.parse(s);
};

const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
  console.log("Connection accepted...");

  ws.on("message", (message: RawData) => {
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

// server.on("upgrade", (req, socket, head) => {
//   const parsedUrl = parse(req.url ?? "", true);
//   const { pathname } = parsedUrl;
//   console.log("Upgrading: ", pathname);
//   if (pathname?.startsWith("webrtcwss")) {
//     console.debug("Handling upgrade to wss...");
//     wss.handleUpgrade(req, socket, head, (ws) => {
//       wss.emit("connection", ws, req);
//     });
//   }
// });

server
  .once("error", (err) => {
    console.error(err);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
