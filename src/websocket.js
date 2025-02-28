import { WebSocketServer } from "ws";

export const setupWebSocket = (server) => {
    const wss = new WebSocketServer({ server });
    const rooms = new Map(); // Map to store roomId -> { peers: Set, type: 'private'|'normal' }

    wss.on("connection", (ws) => {
        console.log("✅ New WebSocket connection established.");

        ws.on("message", (message) => {
            const data = JSON.parse(message.toString());
            console.log("📩 Received:", { type: data.type, roomId: data.roomId, peerId: data.peerId, roomType: data.roomType });

            if (data.type === "join") {
                const { roomId, peerId, roomType } = data;
                if (!roomId || !peerId || !roomType) {
                    console.warn("Invalid roomId, peerId, or roomType, closing connection...");
                    ws.send(JSON.stringify({ type: "error", message: "Invalid roomId, peerId, or roomType." }));
                    ws.close();
                    return;
                }

                if (!rooms.has(roomId)) {
                    rooms.set(roomId, { peers: new Set(), type: roomType });
                }

                const room = rooms.get(roomId);
                if (room.peers.has(peerId)) {
                    console.warn(`Duplicate peerId ${peerId} detected in room ${roomId}. Ignoring join.`);
                    ws.send(JSON.stringify({ type: "error", message: "Duplicate peerId detected. Please reconnect with a new peerId." }));
                    ws.close();
                    return;
                }

                // Limit private rooms to 2 users (P2P)
                if (roomType === 'private' && room.peers.size >= 2) {
                    console.warn(`Room ${roomId} (private) is full (max 2 users). Rejecting peer ${peerId}.`);
                    ws.send(JSON.stringify({ type: "error", message: "Private room is full (max 2 users)." }));
                    ws.close();
                    return;
                }

                room.peers.add(peerId);
                ws.peerId = peerId;
                ws.roomId = roomId;
                const userCount = room.peers.size;
                console.log(`Client joined room: ${roomId} with peerId: ${peerId}, Total users: ${userCount}, Room type: ${roomType}`);

                const peerList = Array.from(room.peers);
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ type: "peerList", peers: peerList }));
                }

                // Notify existing peers based on room type
                room.peers.forEach((existingPeerId) => {
                    if (existingPeerId !== peerId) {
                        wss.clients.forEach((client) => {
                            if (client.roomId === roomId && client.peerId === existingPeerId && client.readyState === client.OPEN) {
                                if (roomType === 'private') {
                                    // P2P: Send newPeer directly to the specific peer
                                    client.send(JSON.stringify({ type: "newPeer", peerId }));
                                } else if (roomType === 'normal') {
                                    // SFU: Broadcast to all peers in the room (simulating SFU behavior)
                                    client.send(JSON.stringify({ type: "newPeer", peerId }));
                                }
                            }
                        });
                    }
                });

                // Placeholder for SFU in normal rooms: Simulate SFU by broadcasting peer info
                if (roomType === 'normal') {
                    wss.clients.forEach((client) => {
                        if (client.roomId === roomId && client.readyState === client.OPEN) {
                            client.send(JSON.stringify({
                                type: "sfuStream",
                                peerId,
                                roomId
                            }));
                        }
                    });
                }
                return;
            }

            const roomId = ws.roomId;
            if (!roomId || !rooms.has(roomId)) {
                console.log("⚠️ Client not in a room or invalid room:", roomId);
                return;
            }

            const room = rooms.get(roomId);
            const userCount = room.peers.size;
            console.log(`Broadcasting ${data.type} from ${ws.peerId} in room ${roomId} to other peers, Total users: ${userCount}, Room type: ${room.type}`);

            // Handle broadcasting based on room type
            if (room.type === 'private' && data.targetPeerId) {
                // P2P: Send to the specific target peer (e.g., for offers, answers, candidates)
                wss.clients.forEach((client) => {
                    if (client.roomId === roomId && client.peerId === data.targetPeerId && client.readyState === client.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            } else {
                // Normal room (SFU) or broadcast for other messages: Send to all peers except sender
                wss.clients.forEach((client) => {
                    if (client.roomId === roomId && client.peerId !== ws.peerId && client.readyState === client.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            }

            // Handle specific message types for SFU in normal rooms (optional enhancement)
            if (room.type === 'normal' && ['offer', 'answer', 'candidate'].includes(data.type)) {
                // Simulate SFU by broadcasting to all peers (in a real SFU, this would go to an SFU server)
                wss.clients.forEach((client) => {
                    if (client.roomId === roomId && client.peerId !== ws.peerId && client.readyState === client.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            }
        });

        ws.on("close", () => {
            const roomId = ws.roomId;
            const peerId = ws.peerId;
            if (roomId && peerId && rooms.has(roomId)) {
                const room = rooms.get(roomId);
                room.peers.delete(peerId);
                const userCount = room.peers.size || 0;
                console.log(`❌ Client disconnected from room: ${roomId} with peerId: ${peerId}, Remaining users: ${userCount}, Room type: ${room.type}`);

                // Notify all remaining peers in the room
                wss.clients.forEach((client) => {
                    if (client.roomId === roomId && client.readyState === client.OPEN) {
                        client.send(JSON.stringify({ type: "peerLeft", peerId }));
                    }
                });

                if (room.peers.size === 0) {
                    rooms.delete(roomId);
                    console.log(`Removed empty room: ${roomId}`);
                }
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