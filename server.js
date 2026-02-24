const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const TOKEN = process.env.CANVAS_PUSH_TOKEN || "";

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, clients: wss.clients.size }));
  }

  if (req.method === "POST" && req.url === "/push") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (data.token !== TOKEN) {
          res.writeHead(401, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "unauthorized" }));
        }
        const msg = JSON.stringify({ type: data.type, content: data.content });
        let sent = 0;
        wss.clients.forEach((ws) => {
          if (ws.readyState === 1) {
            ws.send(msg);
            sent++;
          }
        });
        console.log(`Pushed ${data.type} (${(data.content || "").length} chars) to ${sent} clients`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, sent }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid json" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log(`Client connected (total: ${wss.clients.size})`);
  ws.on("close", () => console.log(`Client disconnected (total: ${wss.clients.size})`));
  ws.on("error", (e) => console.error("WS error:", e.message));
});

server.listen(PORT, () => console.log(`WS server on port ${PORT}`));
