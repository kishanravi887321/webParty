import { WebSocketServer } from "ws";

export const setupWebSocket = (server) => {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws) => {
        console.log("✅ New WebSocket connection established.");

        ws.on("message", (message) => {
            // console.log("📩 Received:", message.toString());

            // Broadcast message to all connected clients
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === client.OPEN) {
                    client.send(message.toString());
                }
            });
        });

        ws.on("close", () => {
            console.log("❌ WebSocket connection closed.");
        });
    });
};
