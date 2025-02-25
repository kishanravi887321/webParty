import express from "express";
import { registerUser, userLogin, updatePassword, forgotPassword } from "../controllers/user.controllers.js";
import { verifyToken } from "../middlewares/verifyjwtToken.middlewares.js";

const router = express.Router();

// Register a new user
router.post("/register", registerUser);

// Login user
router.post("/login", userLogin);

// Update password (User must be authenticated)
router.put("/update-password", verifyToken, updatePassword);

// Forgot password (Request password reset)
router.post("/forgot-password", forgotPassword);

export {router} ;
