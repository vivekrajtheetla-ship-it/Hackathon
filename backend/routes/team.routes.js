import express from 'express';
import { 
    createTeam, 
    getTeams, 
    getMyTeam,
    getParticipantDashboardData, // <-- UPDATED: Replaced getMyTeam with the new comprehensive function
    deleteTeam, 
    updateTeam, 
    getTeamById,
    submitMidProject, // <-- ADDED: New controller for mid-submission
    submitProject     // <-- ADDED: New controller for final submission
} from '../controllers/team.controller.js';
// Import the correct middleware functions
import { verifyUser, verifyRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// --- Protected Routes for Participants ---

// Route to get the currently logged-in user's team (simple team data)
router.get('/my-team', verifyUser, getMyTeam);

// UPDATED: Route to get all data for the participant dashboard
// This MUST come before /:id to avoid conflicts.
router.get('/my-dashboard', verifyUser, getParticipantDashboardData);

// --- Public or General Routes ---
router.get('/', getTeams);
router.get('/:id', getTeamById);

// ADDED: Route for mid-hackathon project submission
router.post('/submit-mid-project', verifyUser, submitMidProject);

// ADDED: Route for final project submission
router.post('/submit-project', verifyUser, submitProject);


// --- Protected Routes for Admins/Coordinators ---

// Create a new team (Protected: Admins and Coordinators only)
router.post(
    '/', 
    verifyUser, 
    verifyRole(['admin', 'coordinator']), 
    createTeam
);

// Update a team (Protected: Admins and Coordinators only)
router.put(
    '/:id', 
    verifyUser, 
    verifyRole(['admin', 'coordinator']), 
    updateTeam
);

// Delete a team (Protected: Admins only)
router.delete(
    '/:id', 
    verifyUser, 
    verifyRole(['admin']), 
    deleteTeam
);

export default router;