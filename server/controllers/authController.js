import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

// ==========================
// Register User
// ==========================
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        // Generate token
        const token = generateToken(user._id);

        // Remove password before sending response
        const userData = await User.findById(user._id).select("-password");

        return res.status(201).json({
            success: true,
            token,
            user: userData,
        });

    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ==========================
// Login User
// ==========================
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Generate token
        const token = generateToken(user._id);

        // Remove password before sending response
        const userData = await User.findById(user._id).select("-password");

        return res.status(200).json({
            success: true,
            token,
            user: userData,
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ==========================
// Get Current User
// ==========================
export const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            user,
        });

    } catch (error) {
        console.error("Get User error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};