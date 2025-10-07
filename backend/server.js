import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';

// --- Import all your route files here ---
import userRoutes from './routes/user.routes.js';
import teamRoutes from './routes/team.routes.js';
import questionRoutes from './routes/question.routes.js'; 
import collegeRoutes from './routes/college.routes.js';
import roleRoutes from './routes/role.routes.js'; 
import authRoutes from './routes/auth.routes.js'; 
import scoreRoutes from './routes/score.routes.js';
import evaluationRoutes from './routes/evaluation.routes.js';

import hackathonRoutes from './routes/hackathon.routes.js';

// Load environment variables
dotenv.config();

// Initialize the Express app
const app = express();
const PORT = process.env.PORT || 9000; // Ensure port matches frontend config

// Connect to the database
connectDB(); 

// --- Global Middleware ---
app.use(cors());
app.use(express.json());



// --- API Routes ---
app.use('/api', authRoutes); 
app.use('/api/users', userRoutes); 
app.use('/api/teams', teamRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/evaluations', evaluationRoutes);

app.use('/api/hackathons', hackathonRoutes);

// --- ⬇️  FIXED HERE ⬇️ ---
// This correctly mounts all question routes under the /api/questions path
app.use('/api/questions', questionRoutes); 

// --- Start the Server ---
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Start periodic hackathon status updates (every 1 minute for more responsive updates)
    setInterval(async () => {
        try {
            const { updateHackathonStatuses, cleanupCompletedHackathons } = await import('./controllers/hackathon.controller.js');
            await updateHackathonStatuses();
            await cleanupCompletedHackathons();
        } catch (error) {
            console.error('Error in periodic status update:', error);
        }
    }, 1 * 60 * 1000); // 1 minute for more responsive status updates
});

server.on('error', (error) => {
    console.error('Server error:', error);
});