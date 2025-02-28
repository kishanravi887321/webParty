import dotenv from "dotenv";
import http from "http";
import { app } from "./app.js";
import { setupWebSocket } from "./websocket.js";
import connectDB from "./db/index.db.js";

dotenv.config({ path: "./main.env" });

const server = http.createServer(app);
setupWebSocket(server);

// Start the server
const PORT = process.env.PORT || 8900;

const startServer = async () => {
    try {
        await connectDB();
        console.log("✅ Connected to MongoDB successfully");
    } catch (err) {
        console.error("⚠️ MongoDB connection failed:", err);
        console.warn("⚠️ Server will still run, but database features may not work.");
    }

    // Start the WebRTC & WebSocket Server even if DB fails
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port: ${PORT}`);
    });
};

startServer();
