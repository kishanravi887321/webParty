import dotenv from "dotenv";
import  {router as userRouter} from "./routes/user.routes.js"
dotenv.config({
    path:'./env'
})

import cors from "cors";
import express from "express";

const app = express();

// 
// Middleware
app.use(express.json());
// app.use(cors({
//     origin: 'http://127.0.0.1:5500', // Match your frontend URL (e.g., Live Server)
//     credentials: true,               // Allow cookies
//     methods: ['GET', 'POST', 'PUT'], // Allow these methods
//     allowedHeaders: ['Content-Type', 'Authorization'] // Allow these headers
// }));
// app.use(cors({ origin: 'http://127.0.0.1:5000', credentials: true }))

app.use(cors({
    origin: '*', // Allow access from anywhere
    credentials: true,               
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use("/api/users",userRouter)


export {app}