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

connectDB().then(()=>{
    server.listen(PORT, () => {
        console.log(`⚙️ Server is running on port: ${PORT}`);
    });
}).catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})

