// server/middleware/auth.middleware.js

import jwt from 'jsonwebtoken';
import User from '../models/user.model.js'; // Ensure this path to your user model is correct

export const verifyUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Authentication failed: No token provided." });
        }

        const token = authHeader.split(' ')[1];
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find the user by ID from the token, excluding the password
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: "Authentication failed: User not found." });
        }

        // Attach the full user object to the request
        req.user = user;
        next();

    } catch (error) {
        console.error("Authentication middleware error:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ message: "Authentication failed: Invalid token." });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ message: "Authentication failed: Token has expired." });
        }
        return res.status(500).json({ message: "Internal server error during authentication." });
    }
};

export const verifyRole = (roles) => (req, res, next) => {
    // Note the change here to use the full user object
    if (!req.user || !roles.includes(req.user.role_name)) {
        return res.status(403).json({ message: "Access denied: You do not have the required role." });
    }
    next();
};