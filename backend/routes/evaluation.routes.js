import express from 'express';
import { verifyUser, verifyRole } from '../middleware/auth.middleware.js';
import {
    getEvaluatorDashboardData,
    submitEvaluation,
    getAllEvaluations,
    getMyEvaluations,
    getEvaluationById,
    updateEvaluation,
    deleteEvaluation,
    selectTeamForEvaluation,
    releaseTeamFromEvaluation,
    getEvaluatorStatus,
    reconnectEvaluatorToHackathon
} from '../controllers/evaluation.controller.js';

const router = express.Router();

// All routes require user authentication
router.use(verifyUser);

// Get evaluator dashboard data
router.get('/dashboard', verifyRole(['evaluator']), getEvaluatorDashboardData);

// Debug endpoint to check evaluator status
router.get('/status', verifyRole(['evaluator']), getEvaluatorStatus);

// Reconnect evaluator to hackathon (for cases where cleanup ran early)
router.post('/reconnect', verifyRole(['evaluator']), reconnectEvaluatorToHackathon);

// Get all evaluations for current hackathon
router.get('/all', verifyRole(['evaluator', 'admin']), getAllEvaluations);

// Get evaluations by current evaluator
router.get('/my-evaluations', verifyRole(['evaluator']), getMyEvaluations);

// Submit new evaluation
router.post('/', verifyRole(['evaluator']), submitEvaluation);

// Get specific evaluation by ID
router.get('/:id', verifyRole(['evaluator']), getEvaluationById);

// Update evaluation
router.put('/:id', verifyRole(['evaluator']), updateEvaluation);

// Delete evaluation
router.delete('/:id', verifyRole(['evaluator']), deleteEvaluation);

// Select team for evaluation (lock)
router.post('/select-team', verifyRole(['evaluator']), selectTeamForEvaluation);

// Release team from evaluation (unlock)
router.post('/release-team', verifyRole(['evaluator']), releaseTeamFromEvaluation);

// Announce winners
router.post('/announce-winners', verifyRole(['evaluator']), async (req, res) => {
    try {
        const { announceWinners } = await import('../controllers/evaluation.controller.js');
        await announceWinners(req, res);
    } catch (error) {
        res.status(500).json({ message: "Error announcing winners", error: error.message });
    }
});

// Cleanup stale locks (admin only)
router.post('/cleanup-stale-locks', verifyRole(['admin']), async (req, res) => {
    try {
        const { cleanupStaleLocks } = await import('../controllers/evaluation.controller.js');
        const releasedCount = await cleanupStaleLocks();
        res.status(200).json({ 
            message: `Cleaned up ${releasedCount} stale team locks`,
            releasedCount 
        });
    } catch (error) {
        res.status(500).json({ message: "Error cleaning up stale locks", error: error.message });
    }
});

export default router;