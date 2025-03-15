import express from "express";
import { registerUser, userLogin, updatePassword, forgotPassword } from "../controllers/user.controllers.js";
import { verifyToken } from "../middlewares/verifyjwtToken.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
const router = express.Router();

// Register a new user
router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ])
    
    
    
    ,registerUser)

// Login user
router.post("/login", userLogin);

// Update password (User must be authenticated)
router.put("/update-password", verifyToken, updatePassword);

// Forgot password (Request password reset)
router.post("/forgot-password", forgotPassword);

export {router} ;
