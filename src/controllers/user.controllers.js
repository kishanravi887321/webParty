import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import validator from "validator";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

///  Register User Controller
const registerUser = asyncHandler(async (req, res) => {
    const { userName, email, password, fullName } = req.body;

    if ([fullName, email, userName, password].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    if (!validator.isEmail(email)) {
        throw new ApiError(400, "Please enter a valid email");
    }

    // if (!validator.isStrongPassword(password)) {
    //     throw new ApiError(400, "Please enter a strong password");
    // }

    const existUser = await User.findOne({ $or: [{ userName }, { email }] });
    if (existUser) {
        return res.status(409).json(new ApiResponse(409, null, "User already exists!"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await User.create({
        email,
        fullName,
        password:hashedPassword,
        userName
    });

    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));
});

///  User Login Controller
const userLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    console.log("Hello");
    if (!email || !password) throw new ApiError(400, "Email and password are required");

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(404, "User not found");

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) throw new ApiError(401, "Incorrect password");

    const accessToken = user.generateAccessToken(user._id);
    return res
        .status(200)
        .cookie('accessToken', accessToken, { 
            httpOnly: true,        // Secure: Prevents JS access
            sameSite: 'Lax',       // CSRF protection
            secure: false,         // Set to true in production with HTTPS
            maxAge: 24 * 60 * 60 * 1000 // 1 day expiry
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
