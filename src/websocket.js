import { WebSocketServer } from "ws";

export const setupWebSocket = (server) => {
    const wss = new WebSocketServer({ server });
    const rooms = new Map(); // Map to store roomId -> Set of WebSocket clients

    wss.on("connection", (ws) => {
        console.log("✅ New WebSocket connection established.");

        ws.on("message", (message) => {
            const data = JSON.parse(message.toString());
            console.log("📩 Received:", data);

            // Handle room joining
            if (data.type === "join") {
                const roomId = data.roomId;
                if (!rooms.has(roomId)) {
                    rooms.set(roomId, new Set());
                }
                rooms.get(roomId).add(ws);
                ws.roomId = roomId; // Store roomId on the WebSocket object
                console.log(`Client joined room: ${roomId}, Total clients: ${rooms.get(roomId).size}`);
                return; // Early return after joining
            }

            // Broadcast messages to clients in the same room
            const roomId = ws.roomId;
            if (!roomId || !rooms.has(roomId)) {
                console.log("⚠️ Client not in a room or invalid room:", roomId);
                return;
            }

            rooms.get(roomId).forEach((client) => {
                // Send to all clients in the room except the sender
                if (client !== ws && client.readyState === client.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        });

        ws.on("close", () => {
            const roomId = ws.roomId;
            if (roomId && rooms.has(roomId)) {
                rooms.get(roomId).delete(ws);
                if (rooms.get(roomId).size === 0) {
                    rooms.delete(roomId); // Clean up empty rooms
                }
                console.log(`❌ Client disconnected from room: ${roomId}, Remaining: ${rooms.get(roomId)?.size || 0}`);
            } else {
                console.log("❌ WebSocket connection closed (not in a room).");
            }
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
        });
    });

    console.log("WebSocket server setup complete.");
};