import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import validator from "validator";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import {uploadImage} from "../utils/cloud.js"

dotenv.config({ path: "../../.env" });

///  Register User Controller
const registerUser = asyncHandler(async (req, res) => {
    const { userName, email, password, fullName } = req.body;

    console.log(userName,email,password,fullName)

    // Check for empty fields
    if ([fullName, email, userName, password].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    if (!validator.isEmail(email)) {
        throw new ApiError(400, "Please enter a valid email");
    }

    // Check if the user already exists
    const existUser = await User.findOne({ $or: [{ userName }, { email }] });
    if (existUser) {
        return res.status(409).json(new ApiResponse(409, null, "User already exists!"));
    }

    // Handle avatar upload
    let avatarUrl;
    if (req.files?.avatar?.[0]?.path) {
        try {
            avatarUrl = await uploadImage(req.files.avatar[0].path);
        } catch (error) {
            console.error("Error uploading avatar:", error.message);
            throw new ApiError(500, "Failed to upload avatar image");
        }
    }
    

    // Create user
    const createdUserEntry = await User.create({
        email,
        fullName,
        password,
        avatar: avatarUrl,
        userName,
    });

    // Retrieve user without sensitive fields
    const createdUser = await User.findById(createdUserEntry._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json({
        success: true,
        user: createdUser,
        message: "User registered successfully"
    });
    
});


///  User Login Controller
const userLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    console.log("Login Attempt:", { email, password });

    if (!email || !password) throw new ApiError(400, "Email and password are required");

    const user = await User.findOne({ email });
    if (!user) {
        console.log("User not found");
        throw new ApiError(404, "User not found");
    }

    // Debugging: Check stored password
    console.log("Stored Hashed Password:", user.password);

    // Compare entered password with hashed password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
        console.log("Invalid Password Entered");
        throw new ApiError(401, "Incorrect password");
    }

    console.log("Password matched! Generating token...");

    // Generate token if password is correct
    const accessToken = user.generateAccessToken(user._id);

    return res
        .status(200)
        .cookie('accessToken', accessToken, { 
            httpOnly: true,        
            sameSite: 'Lax',       
            secure: false,         
            maxAge: 24 * 60 * 60 * 1000 
        })
        .json(new ApiResponse(200, { user, accessToken }, "User logged in successfully!"));
});

///  Update Password Controller (No Hashing)
const updatePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findOne({ email: req.user.email });
    if (!user) throw new ApiError(404, "User not found");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new ApiError(400, "Incorrect old password");

    if (!validator.isStrongPassword(newPassword)) {
        throw new ApiError(400, "New password is not strong enough");
    }

    user.password = await bcrypt.hash(newPassword, 10); // Hash the new password
    await user.save();

    return res.status(200).json(new ApiResponse(200, null, "Password updated successfully"));
});

///  Forgot Password Controller
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
        throw new ApiError(400, "Please provide a valid email");
    }

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(404, "User not found");

    const resetToken = user.generatePasswordResetToken(); // Implement this in your User model
    await user.save();

    // Send email logic here (using Nodemailer, SendGrid, etc.)
    // Example: sendResetEmail(user.email, resetToken);

    return res.status(200).json(new ApiResponse(200, null, "Password reset link sent"));
});

export { registerUser, userLogin, updatePassword, forgotPassword };
