import Hackathon from '../models/hackathon.model.js';
import User from '../models/user.model.js';
import Team from '../models/team.model.js';
import Evaluation from '../models/evaluation.model.js';


export const createHackathon = async (req, res) => {
    try {
        const {
            hackathon_name,
            start_datetime,
            mid_submission_datetime,
            end_datetime,
            registrationDeadline,
            venue
        } = req.body;

        if (!hackathon_name || !start_datetime || !end_datetime || !venue) {
            return res.status(400).json({ message: "Please provide all required fields." });
        }

        const newHackathon = new Hackathon({
            hackathon_name,
            start_datetime,
            mid_submission_datetime,
            end_datetime,
            registrationDeadline,
            venue,
            status: 'upcoming'
        });

        const savedHackathon = await newHackathon.save();
        res.status(201).json({ message: 'Hackathon created successfully!', hackathon: savedHackathon });
    } catch (error) {
        console.error("Error creating hackathon:", error);
        res.status(500).json({ message: 'Error creating hackathon', error: error.message });
    }
};

export const getHackathons = async (req, res) => {
    try {
        const currentTime = new Date();
        
        // First, update hackathon statuses based on current time
        await updateHackathonStatuses();
        
        // Filter hackathons that participants can register for:
        // 1. Haven't ended yet (end_datetime >= currentTime)
        // 2. Registration deadline hasn't passed (registrationDeadline >= currentTime OR no registrationDeadline set)
        // 3. Winners haven't been announced yet
        // 4. Status is 'upcoming' or 'active' (not 'completed')
        const availableHackathons = await Hackathon.find({
            end_datetime: { $gte: currentTime },
            status: { $in: ['upcoming', 'active'] },
            $or: [
                { registrationDeadline: { $gte: currentTime } },
                { registrationDeadline: { $exists: false } },
                { registrationDeadline: null }
            ],
            $and: [
                {
                    $or: [
                        { 'winners.firstPlace': { $exists: false } },
                        { 'winners.firstPlace': null }
                    ]
                }
            ]
        }).sort({ start_datetime: 1 });
        
        res.status(200).json(availableHackathons);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching available hackathons.', error: error.message });
    }
};



// Helper function to update hackathon statuses based on current time
const updateHackathonStatuses = async () => {
    try {
        const currentTime = new Date();
        
        // Update to 'active' if start time has passed but end time hasn't
        const activatedHackathons = await Hackathon.updateMany(
            {
                start_datetime: { $lte: currentTime },
                end_datetime: { $gte: currentTime },
                status: 'upcoming'
            },
            { $set: { status: 'active' } }
        );
        
        // Update to 'completed' if end time has passed AND winners are announced
        // This prevents automatic completion without proper evaluation
        const hackathonsToComplete = await Hackathon.find({
            end_datetime: { $lt: currentTime },
            status: { $in: ['upcoming', 'active'] },
            $or: [
                { 'winners.firstPlace': { $exists: true, $ne: null } },
                { 'winners.secondPlace': { $exists: true, $ne: null } },
                { 'winners.thirdPlace': { $exists: true, $ne: null } }
            ]
        });

        let completedCount = 0;
        for (const hackathon of hackathonsToComplete) {
            await Hackathon.findByIdAndUpdate(hackathon._id, { $set: { status: 'completed' } });
            completedCount++;
        }

        const completedHackathons = { modifiedCount: completedCount };
        
        if (activatedHackathons.modifiedCount > 0) {
            console.log(`${activatedHackathons.modifiedCount} hackathon(s) activated`);
        }
        
        if (completedHackathons.modifiedCount > 0) {
            console.log(`${completedHackathons.modifiedCount} hackathon(s) marked as completed`);
        }
        
    } catch (error) {
        console.error('Error updating hackathon statuses:', error);
    }
};

// Revert coordinator and evaluator roles to participant for a specific hackathon
const revertRolesToParticipant = async (hackathonId) => {
    try {
        console.log(`Starting role reversion for hackathon: ${hackathonId}`);
        
        // Find all coordinators and evaluators in this hackathon
        const coordinators = await User.find({
            current_hackathon: hackathonId,
            role_name: 'coordinator'
        });
        
        const evaluators = await User.find({
            current_hackathon: hackathonId,
            role_name: 'evaluator'
        });
        
        console.log(`Found ${coordinators.length} coordinators and ${evaluators.length} evaluators to revert`);
        
        let coordinatorsReverted = 0;
        let evaluatorsReverted = 0;
        
        // Revert coordinators to participants and clear hackathon assignment
        for (const coordinator of coordinators) {
            try {
                await User.findByIdAndUpdate(coordinator._id, {
                    $set: { 
                        role_name: 'participant',
                        current_hackathon: null
                    }
                });
                coordinatorsReverted++;
                console.log(`✓ Reverted coordinator ${coordinator.user_name} to participant and cleared hackathon assignment`);
            } catch (error) {
                console.error(`✗ Failed to revert coordinator ${coordinator._id}:`, error);
            }
        }
        
        // Revert evaluators to participants and clear hackathon assignment
        for (const evaluator of evaluators) {
            try {
                await User.findByIdAndUpdate(evaluator._id, {
                    $set: { 
                        role_name: 'participant',
                        current_hackathon: null
                    }
                });
                evaluatorsReverted++;
                console.log(`✓ Reverted evaluator ${evaluator.user_name} to participant and cleared hackathon assignment`);
            } catch (error) {
                console.error(`✗ Failed to revert evaluator ${evaluator._id}:`, error);
            }
        }
        
        console.log(`Role reversion complete: ${coordinatorsReverted} coordinators + ${evaluatorsReverted} evaluators = ${coordinatorsReverted + evaluatorsReverted} total reverted`);
        
        return {
            coordinatorsReverted,
            evaluatorsReverted,
            totalReverted: coordinatorsReverted + evaluatorsReverted
        };
    } catch (error) {
        console.error('Error reverting roles to participant:', error);
        return {
            coordinatorsReverted: 0,
            evaluatorsReverted: 0,
            totalReverted: 0
        };
    }
};

// Perform complete cleanup including hackathon assignments and role reversion
const performCompleteCleanup = async (hackathonId) => {
    try {
        const startTime = new Date();
        console.log(`Starting complete cleanup for hackathon: ${hackathonId} at ${startTime}`);
        
        // Step 1: Revert roles to participant and clear hackathon assignments for coordinators and evaluators
        const roleReversion = await revertRolesToParticipant(hackathonId);
        
        // Step 2: Clear hackathon assignments for ALL remaining users (including participants)
        const allUsersResult = await User.updateMany(
            { current_hackathon: hackathonId },
            { $set: { current_hackathon: null } }
        );
        
        // Step 3: Get count of participants specifically for reporting
        const participantCount = await User.countDocuments({
            current_hackathon: null,
            role_name: 'participant'
        });
        
        const endTime = new Date();
        const processingTime = endTime - startTime;
        
        const statistics = {
            hackathonId,
            allUsersCleared: allUsersResult.modifiedCount,
            coordinatorsReverted: roleReversion.coordinatorsReverted,
            evaluatorsReverted: roleReversion.evaluatorsReverted,
            totalUsersAffected: allUsersResult.modifiedCount,
            startTime,
            endTime,
            processingTime: `${processingTime}ms`,
            trigger: 'automatic',
            message: 'All users (coordinators, evaluators, and participants) have been cleared from hackathon and roles reverted to participant'
        };
        
        console.log('Complete cleanup statistics:', statistics);
        return statistics;
    } catch (error) {
        console.error('Error performing complete cleanup:', error);
        throw error;
    }
};

// Enhanced cleanup function with role reversion
const cleanupCompletedHackathons = async () => {
    try {
        const currentTime = new Date();
        
        // Find hackathons that have ended AND have winners actually announced
        const completedHackathons = await Hackathon.find({
            end_datetime: { $lt: currentTime },
            status: 'completed',
            winnersAnnouncedAt: { $exists: true, $ne: null } // Must have announcement timestamp
        }).select('_id');

        if (completedHackathons.length > 0) {
            console.log(`Found ${completedHackathons.length} completed hackathons with winners announced - starting cleanup`);
            
            for (const hackathon of completedHackathons) {
                try {
                    console.log(`Cleaning up hackathon: ${hackathon._id}`);
                    await performCompleteCleanup(hackathon._id);
                    console.log(`✅ Successfully cleaned up hackathon: ${hackathon._id}`);
                } catch (error) {
                    console.error(`❌ Failed to cleanup hackathon ${hackathon._id}:`, error);
                }
            }
        } else {
            // Only log occasionally to avoid spam
            const now = new Date();
            if (now.getMinutes() % 5 === 0) { // Log every 5 minutes
                console.log('No hackathons ready for cleanup (waiting for winner announcements)');
            }
        }
    } catch (error) {
        console.error('Error cleaning up completed hackathons:', error);
    }
};

// Enhanced cleanup with role reversion for manual admin use
const enhancedCleanupCompletedHackathons = async () => {
    try {
        const currentTime = new Date();
        
        // Find hackathons that have ended AND have winners actually announced
        const completedHackathons = await Hackathon.find({
            end_datetime: { $lt: currentTime },
            status: 'completed',
            winnersAnnouncedAt: { $exists: true, $ne: null } // Must have announcement timestamp
        }).select('_id hackathon_name');

        if (completedHackathons.length === 0) {
            return {
                message: 'No completed hackathons found to clean up',
                statistics: []
            };
        }

        const allStatistics = [];
        
        for (const hackathon of completedHackathons) {
            try {
                const stats = await performCompleteCleanup(hackathon._id);
                stats.hackathonName = hackathon.hackathon_name;
                stats.trigger = 'manual';
                allStatistics.push(stats);
            } catch (error) {
                console.error(`Failed to cleanup hackathon ${hackathon._id}:`, error);
                allStatistics.push({
                    hackathonId: hackathon._id,
                    hackathonName: hackathon.hackathon_name,
                    error: error.message,
                    trigger: 'manual'
                });
            }
        }
        
        return {
            message: `Cleaned up ${completedHackathons.length} completed hackathons`,
            statistics: allStatistics
        };
    } catch (error) {
        console.error('Error in enhanced cleanup:', error);
        throw error;
    }
};

// Export the functions so they can be used elsewhere
export { updateHackathonStatuses, cleanupCompletedHackathons, performCompleteCleanup, enhancedCleanupCompletedHackathons };


export const getAllHackathonsForAdmin = async (req, res) => {
    try {
        const allHackathons = await Hackathon.find({}).sort({ createdAt: -1 });
        res.status(200).json(allHackathons);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching all hackathons for admin.', error: error.message });
    }
};

export const getHackathonById = async (req, res) => {
    try {
        const hackathon = await Hackathon.findById(req.params.id)
            .populate({
                path: 'teams',
                populate: { path: 'members', model: 'User', select: 'user_name user_email' }
            })
            .populate('winners.firstPlace winners.secondPlace winners.thirdPlace', 'team_name')
            .populate('questions');

        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }

        const allUsersInHackathon = await User.find({ current_hackathon: req.params.id }).select('user_name user_email role_name');
        const participantsInTeams = hackathon.teams.flatMap(team => team.members.map(member => ({ ...member.toObject(), team_name: team.team_name })));
        const participantIdsInTeams = new Set(participantsInTeams.map(p => p._id.toString()));
        const participantsNotInTeams = allUsersInHackathon.filter(user => user.role_name === 'participant' && !participantIdsInTeams.has(user._id.toString()));
        const allParticipants = [...participantsInTeams, ...participantsNotInTeams];
        const coordinators = allUsersInHackathon.filter(u => u.role_name === 'coordinator');
        const evaluators = allUsersInHackathon.filter(u => u.role_name === 'evaluator');

        const responseData = {
            ...hackathon.toObject(),
            counts: { teams: hackathon.teams.length, participants: allParticipants.length, coordinators: coordinators.length, evaluators: evaluators.length },
            managementLists: { coordinators, evaluators, participants: allParticipants, teams: hackathon.teams },
        };
        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hackathon details', error: error.message });
    }
};


export const updateHackathon = async (req, res) => {
    try {
        const updatedHackathon = await Hackathon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedHackathon) return res.status(404).json({ message: 'Hackathon not found' });
        res.status(200).json({ message: 'Hackathon updated successfully', hackathon: updatedHackathon });
    } catch (error) {
        console.error('Error updating hackathon:', error);
        res.status(500).json({ message: 'Error updating hackathon', error: error.message });
    }
};

export const getHackathonWinners = async (req, res) => {
    try {
        const completedHackathons = await Hackathon.find({ 
            status: 'completed',
            'winners.firstPlace': { $exists: true, $ne: null }
        })
            .populate('winners.firstPlace winners.secondPlace winners.thirdPlace', 'team_name members')
            .populate({
                path: 'winners.firstPlace winners.secondPlace winners.thirdPlace',
                populate: {
                    path: 'members',
                    select: 'user_name'
                }
            })
            .sort({ winnersAnnouncedAt: -1 });
        res.status(200).json(completedHackathons);
    } catch (error) {
        console.error('Error fetching winners:', error);
        res.status(500).json({ message: 'Error fetching winners', error: error.message });
    }
};

// Get recent winners for homepage (last 6 hours)
export const getRecentWinners = async (req, res) => {
    try {
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        
        const recentWinners = await Hackathon.find({
            status: 'completed',
            'winners.firstPlace': { $exists: true, $ne: null },
            winnersAnnouncedAt: { $gte: sixHoursAgo }
        })
            .populate('winners.firstPlace winners.secondPlace winners.thirdPlace', 'team_name members')
            .populate({
                path: 'winners.firstPlace winners.secondPlace winners.thirdPlace',
                populate: {
                    path: 'members',
                    select: 'user_name'
                }
            })
            .sort({ winnersAnnouncedAt: -1 })
            .limit(5); // Limit to 5 most recent

        res.status(200).json(recentWinners);
    } catch (error) {
        console.error('Error fetching recent winners:', error);
        res.status(500).json({ message: 'Error fetching recent winners', error: error.message });
    }
};



export const joinHackathon = async (req, res) => {
    try {
        const { hackathonId } = req.params;
        // --- ⬇️ FIXED: Get user ID from the req.user object set by the auth middleware ---
        const userId = req.user._id;

        const hackathon = await Hackathon.findById(hackathonId);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });

        const currentTime = new Date();
        
        // Check if hackathon has ended
        if (hackathon.end_datetime < currentTime) {
            return res.status(400).json({ message: 'This hackathon has already ended.' });
        }
        
        // Check if registration deadline has passed
        if (hackathon.registrationDeadline && hackathon.registrationDeadline < currentTime) {
            return res.status(400).json({ message: 'Registration deadline for this hackathon has passed.' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.current_hackathon) return res.status(400).json({ message: 'You are already in a hackathon.' });

        user.current_hackathon = hackathonId;
        await user.save();

        // --- ⬇️ FIXED: Use correct property 'hackathon_name' from the model ---
        res.status(200).json({ message: `Successfully joined ${hackathon.hackathon_name}!` });
    } catch (error) {
        console.error('Error joining hackathon:', error);
        res.status(500).json({ message: 'Error joining hackathon', error: error.message });
    }
};

export const leaveHackathon = async (req, res) => {
    try {
        const userId = req.user._id; // Fixed: Use req.user._id from auth middleware
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.current_hackathon) return res.status(400).json({ message: 'Not in any hackathon' });
        
        // Remove user from all teams in their current hackathon
        await Team.updateMany(
            { hackathon_id: user.current_hackathon, members: userId }, 
            { $pull: { members: userId } }
        );
        
        // Clear the user's current hackathon assignment
        user.current_hackathon = null;
        await user.save();
        
        res.status(200).json({ 
            message: 'Successfully left the hackathon. You can now register for new events!',
            user: {
                _id: user._id,
                user_name: user.user_name,
                current_hackathon: user.current_hackathon
            }
        });
    } catch (error) {
        console.error('Error leaving hackathon:', error);
        res.status(500).json({ message: 'Error leaving hackathon', error: error.message });
    }
};

export const checkActiveOrUpcomingHackathon = async (req, res) => {
    try {
        const currentTime = new Date();
        const availableHackathon = await Hackathon.findOne({ endDate: { $gte: currentTime } });
        if (availableHackathon) {
            return res.status(200).json({ exists: true, message: 'Active or upcoming events are available.' });
        } else {
            return res.status(200).json({ exists: false, message: 'No active or upcoming hackathons found.' });
        }
    } catch (error) {
        console.error("Error in checkActiveOrUpcomingHackathon:", error);
        res.status(500).json({ message: 'Error checking active hackathons', error: error.message });
    }
};

export const updateHackathonQuestions = async (req, res) => {
    try {
        const { id } = req.params;
        const { questionIds } = req.body;
        if (!Array.isArray(questionIds)) {
            return res.status(400).json({ message: 'questionIds must be an array.' });
        }
        const updatedHackathon = await Hackathon.findByIdAndUpdate(
            id,
            { $set: { questions: questionIds } },
            { new: true }
        );
        if (!updatedHackathon) return res.status(404).json({ message: 'Hackathon not found' });
        res.status(200).json({ message: 'Hackathon questions updated successfully.', hackathon: updatedHackathon });
    } catch (error) {
        console.error('Error updating hackathon questions:', error);
        res.status(500).json({ message: 'Error updating hackathon questions', error: error.message });
    }
};

export const updateHackathonStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['upcoming', 'active', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be one of: upcoming, active, completed' });
        }
        
        const hackathon = await Hackathon.findById(id);
        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }
        
        // Additional validation for status transitions
        const currentTime = new Date();
        if (status === 'completed' && hackathon.end_datetime > currentTime) {
            return res.status(400).json({ message: 'Cannot mark hackathon as completed before end time' });
        }
        
        const updatedHackathon = await Hackathon.findByIdAndUpdate(
            id,
            { $set: { status } },
            { new: true }
        );
        
        res.status(200).json({ 
            message: `Hackathon status updated to ${status}`, 
            hackathon: updatedHackathon 
        });
    } catch (error) {
        console.error('Error updating hackathon status:', error);
        res.status(500).json({ message: 'Error updating hackathon status', error: error.message });
    }
};

// Function to automatically update hackathon status when end time is reached
export const markHackathonAsCompleted = async (req, res) => {
    try {
        const { id } = req.params;
        
        const hackathon = await Hackathon.findById(id);
        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }
        
        const currentTime = new Date();
        
        // Check if hackathon has actually ended
        if (hackathon.end_datetime > currentTime) {
            return res.status(400).json({ message: 'Hackathon has not ended yet' });
        }
        
        // Update status to completed
        const updatedHackathon = await Hackathon.findByIdAndUpdate(
            id,
            { $set: { status: 'completed' } },
            { new: true }
        );
        
        res.status(200).json({ 
            message: 'Hackathon marked as completed', 
            hackathon: updatedHackathon 
        });
    } catch (error) {
        console.error('Error marking hackathon as completed:', error);
        res.status(500).json({ message: 'Error marking hackathon as completed', error: error.message });
    }
};

// Manual cleanup endpoint for admins
export const manualCleanupCompletedHackathons = async (req, res) => {
    try {
        // This endpoint should be protected by admin role verification middleware
        console.log('Manual cleanup requested by admin:', req.user.user_name);
        
        const result = await enhancedCleanupCompletedHackathons();
        
        res.status(200).json({
            message: 'Manual cleanup completed successfully',
            ...result
        });
    } catch (error) {
        console.error('Error in manual cleanup:', error);
        res.status(500).json({ 
            message: 'Error performing manual cleanup', 
            error: error.message 
        });
    }
};

// Debug endpoint to check hackathon cleanup status
export const checkHackathonCleanupStatus = async (req, res) => {
    try {
        const { hackathonId } = req.params;
        
        if (!hackathonId) {
            return res.status(400).json({ message: 'Hackathon ID is required' });
        }
        
        // Get all users still assigned to this hackathon
        const usersStillAssigned = await User.find({ current_hackathon: hackathonId })
            .select('user_name user_email role_name current_hackathon');
        
        // Get hackathon details
        const hackathon = await Hackathon.findById(hackathonId)
            .select('hackathon_name status winners winnersAnnouncedAt');
        
        const status = {
            hackathon: hackathon || { message: 'Hackathon not found' },
            usersStillAssigned: usersStillAssigned.length,
            userDetails: usersStillAssigned,
            isCleanupComplete: usersStillAssigned.length === 0,
            breakdown: {
                participants: usersStillAssigned.filter(u => u.role_name === 'participant').length,
                coordinators: usersStillAssigned.filter(u => u.role_name === 'coordinator').length,
                evaluators: usersStillAssigned.filter(u => u.role_name === 'evaluator').length
            }
        };
        
        res.status(200).json(status);
    } catch (error) {
        console.error('Error checking cleanup status:', error);
        res.status(500).json({ 
            message: 'Error checking cleanup status', 
            error: error.message 
        });
    }
};