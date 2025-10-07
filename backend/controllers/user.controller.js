import User from '../models/user.model.js';
import Team from '../models/team.model.js';
import bcrypt from 'bcryptjs';

// --- Get All Users ---
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-user_password')
            .populate('current_hackathon', 'name');

        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

// --- Get Available Participants ---
export const getAvailableParticipants = async (req, res) => {
    try {
        // Get the coordinator's current hackathon from their user record
        const coordinatorId = req.userId; // From auth middleware
        const coordinator = await User.findById(coordinatorId);

        if (!coordinator || !coordinator.current_hackathon) {
            return res.status(400).json({ message: 'Coordinator not assigned to any hackathon' });
        }

        // Find participants assigned to the same hackathon as the coordinator
        const participants = await User.find({
            role_name: 'participant',
            current_hackathon: coordinator.current_hackathon
        }).select('-user_password');

        res.status(200).json(participants);
    } catch (error) {
        console.error('Error fetching available participants:', error);
        res.status(500).json({ message: 'Error fetching available participants', error: error.message });
    }
};

// --- Register User (Public) ---
export const registerUser = async (req, res) => {
    try {
        const { user_name, user_email, user_password, user_phoneno, college_name } = req.body;

        // Validate required fields
        if (!user_name || !user_email || !user_password) {
            return res.status(400).json({ message: "Username, email, and password are required." });
        }

        if (!user_phoneno) {
            return res.status(400).json({ message: "Phone number is required." });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user_email)) {
            return res.status(400).json({ message: "Please provide a valid email address." });
        }

        // Validate phone number format (basic validation for digits)
        const phoneRegex = /^\d{10,15}$/;
        if (!phoneRegex.test(user_phoneno)) {
            return res.status(400).json({ message: "Please provide a valid phone number (10-15 digits)." });
        }

        // Check for existing email
        const existingUserByEmail = await User.findOne({ user_email });
        if (existingUserByEmail) {
            return res.status(400).json({ message: 'User already exists with this email address' });
        }

        // Check for existing phone number
        const existingUserByPhone = await User.findOne({ user_phoneno });
        if (existingUserByPhone) {
            return res.status(400).json({ message: 'User already exists with this phone number' });
        }

        const hashedPassword = await bcrypt.hash(user_password, 12);

        const newUser = new User({
            user_name,
            user_email,
            user_password: hashedPassword,
            user_phoneno,
            college_name,
            role_name: 'participant' // Default role
        });

        await newUser.save();

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                _id: newUser._id,
                user_name: newUser.user_name,
                user_email: newUser.user_email,
                role_name: newUser.role_name
            }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

// --- Update User Role and Hackathon Assignment (Admin) ---
export const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, current_hackathon } = req.body;

        const allowedRoles = ['admin', 'evaluator', 'coordinator', 'participant'];

        if (role && !allowedRoles.includes(role)) {
            return res.status(400).json({
                message: `Invalid role provided. Allowed roles: ${allowedRoles.join(', ')}.`
            });
        }

        const updateData = {
            role_name: role,
            current_hackathon: current_hackathon || null
        };

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-user_password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ message: 'User updated successfully.', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user role', error: error.message });
    }
};

// --- Delete User (Admin) ---
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Remove the user from any teams they are a part of to maintain data integrity
        await Team.updateMany(
            { members: id },
            { $pull: { members: id } }
        );

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};

// Assign hackathon to user (for admins to assign evaluators to hackathons)
export const assignHackathonToUser = async (req, res) => {
    try {
        const { userId, hackathonId } = req.body;

        if (!userId || !hackathonId) {
            return res.status(400).json({ message: "User ID and Hackathon ID are required" });
        }

        // Verify hackathon exists
        const Hackathon = (await import('../models/hackathon.model.js')).default;
        const hackathon = await Hackathon.findById(hackathonId);
        if (!hackathon) {
            return res.status(404).json({ message: "Hackathon not found" });
        }

        // Update user's current hackathon
        const user = await User.findByIdAndUpdate(
            userId,
            { current_hackathon: hackathonId },
            { new: true }
        ).select('-user_password');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: `User ${user.user_name} assigned to hackathon ${hackathon.hackathon_name}`,
            user: {
                _id: user._id,
                user_name: user.user_name,
                user_email: user.user_email,
                role_name: user.role_name,
                current_hackathon: user.current_hackathon
            },
            hackathon: {
                _id: hackathon._id,
                hackathon_name: hackathon.hackathon_name
            }
        });

    } catch (error) {
        console.error("Error assigning hackathon to user:", error);
        res.status(500).json({ message: "Server error while assigning hackathon", error: error.message });
    }
};