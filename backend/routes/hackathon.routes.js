import express from 'express';
import { verifyUser, verifyRole } from '../middleware/auth.middleware.js'; 
import { 
    createHackathon, 
    getHackathons, 
    getAllHackathonsForAdmin,
    getHackathonWinners, 
    getRecentWinners,
    checkActiveOrUpcomingHackathon,
    getHackathonById, 
    updateHackathon,
    joinHackathon,
    leaveHackathon,
    updateHackathonQuestions,
    updateHackathonStatus,
    markHackathonAsCompleted,
    manualCleanupCompletedHackathons
} from '../controllers/hackathon.controller.js';
// REMOVED: No longer importing from question.controller.js

const router = express.Router();

router.get('/all', verifyUser, getAllHackathonsForAdmin); 
router.get('/', getHackathons); 
router.post('/', verifyUser, createHackathon); 
router.get('/active-or-upcoming', checkActiveOrUpcomingHackathon);
router.get('/winners', getHackathonWinners);
router.get('/recent-winners', getRecentWinners);

// REMOVED: The '/domains-and-questions' route has been deleted from this file.

router.get('/:id', getHackathonById); 
router.put('/:id', verifyUser, updateHackathon); 

router.post('/join/:hackathonId', verifyUser, joinHackathon);
router.post('/leave', verifyUser, leaveHackathon);
router.put('/:id/questions', verifyUser, updateHackathonQuestions);
router.put('/:id/status', verifyUser, updateHackathonStatus);
router.post('/:id/mark-completed', verifyUser, markHackathonAsCompleted);
router.post('/cleanup-completed-with-roles', verifyUser, verifyRole(['admin']), manualCleanupCompletedHackathons);

export default router;