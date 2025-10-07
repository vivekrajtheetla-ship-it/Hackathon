import Team from '../models/team.model.js';
import Hackathon from '../models/hackathon.model.js';
import User from '../models/user.model.js';
import Question from '../models/question.model.js';
import mongoose from 'mongoose';


export const getParticipantDashboardData = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        
        // Get user to check their current hackathon assignment
        const user = await User.findById(userId);
        if (!user || !user.current_hackathon) {
            return res.status(404).json({ message: "You are not registered for any hackathon." });
        }

        // Get hackathon data first
        const hackathon = await Hackathon.findById(user.current_hackathon);
        if (!hackathon) {
            return res.status(404).json({ message: "Hackathon details not found." });
        }

        // Try to find team assignment
        const team = await Team.findOne({ members: userId })
            .populate('members', 'user_name')
            .populate('q_id')
            .populate('coordinator_id', 'user_name');

        // If no team found but hackathon is not active yet, return hackathon info for waiting screen
        if (!team) {
            if (hackathon.status === 'upcoming') {
                return res.status(200).json({
                    hackathon: {
                        _id: hackathon._id,
                        hackathon_name: hackathon.hackathon_name,
                        start_datetime: hackathon.start_datetime,
                        mid_submission_datetime: hackathon.mid_submission_datetime,
                        end_datetime: hackathon.end_datetime,
                        venue: hackathon.venue,
                        status: hackathon.status,
                        winners: hackathon.winners
                    },
                    waitingForTeamAssignment: true
                });
            } else {
                return res.status(404).json({ message: "You have not been assigned to a team yet." });
            }
        }

        // Verify team belongs to user's current hackathon
        if (team.hackathon_id.toString() !== user.current_hackathon.toString()) {
            return res.status(404).json({ message: "Team assignment mismatch with your current hackathon." });
        }

        // Calculate actual stats from database for this hackathon
        const hackathonId = team.hackathon_id;
        const [totalParticipants, totalProjects, totalTeams, totalCoordinators] = await Promise.all([
            User.countDocuments({ role_name: 'participant', current_hackathon: hackathonId }),
            Question.countDocuments(),
            Team.countDocuments({ hackathon_id: hackathonId }),
            User.countDocuments({ role_name: 'coordinator', current_hackathon: hackathonId })
        ]);

        const stats = {
            total_participants: totalParticipants,
            total_projects: totalProjects,
            total_teams: totalTeams,
            total_coordinators: totalCoordinators
        };

        const dashboardData = {
            hackathon: {
                _id: hackathon._id,
                hackathon_name: hackathon.hackathon_name,
                start_datetime: hackathon.start_datetime,
                mid_submission_datetime: hackathon.mid_submission_datetime,
                end_datetime: hackathon.end_datetime,
                status: hackathon.status
            },
            stats,
            team: {
                _id: team._id,
                team_name: team.team_name,
                members: team.members,
                project: {
                    domain: team.q_id?.domain,
                    title: team.q_id?.q_title,
                    description: team.q_id?.q_description,
                    criteria: team.q_id?.evaluationCriteria?.map(c => c.name).join(', ') || '',
                },
                coordinator: team.coordinator_id,
                mid_submission: team.mid_submission,
                github_submission: team.github_submission
            }
        };
        
        res.status(200).json(dashboardData);
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Server error while fetching dashboard data.", error: error.message });
    }
};

export const submitMidProject = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const { githubUrl } = req.body;
        if (!githubUrl) return res.status(400).json({ message: "GitHub URL is required." });

        const team = await Team.findOne({ members: userId });
        if (!team) return res.status(404).json({ message: "You are not part of a team." });

        const hackathon = await Hackathon.findById(team.hackathon_id);
        if (new Date() > new Date(hackathon.mid_submission_datetime)) {
            return res.status(403).json({ message: "The mid-submission deadline has passed." });
        }

        team.mid_submission = { url: githubUrl, submitted_at: new Date() };
        await team.save();
        res.status(200).json({ message: "Mid-project submitted successfully!", submission: team.mid_submission });
    } catch (error) {
        console.error("Error submitting mid-project:", error);
        res.status(500).json({ message: "Server error during mid-project submission." });
    }
};

export const submitProject = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const { githubUrl } = req.body;
        if (!githubUrl) return res.status(400).json({ message: "GitHub URL is required." });

        const team = await Team.findOne({ members: userId });
        if (!team) return res.status(404).json({ message: "You are not part of a team." });

        const hackathon = await Hackathon.findById(team.hackathon_id);
        if (new Date() > new Date(hackathon.end_datetime)) {
            return res.status(403).json({ message: "The final submission deadline has passed." });
        }

        team.github_submission = { url: githubUrl, submitted_at: new Date() };
        await team.save();
        res.status(200).json({ message: "Final project submitted successfully!", submission: team.github_submission });
    } catch (error) {
        console.error("Error submitting final project:", error);
        res.status(500).json({ message: "Server error during final project submission." });
    }
};



// --- CREATE A NEW TEAM (CORRECTED) ---
export const createTeam = async (req, res) => {
    try {
        const coordinator_id = req.user._id; // Get coordinator ID from auth middleware

        // 1. --- FIXED: SEPARATE AUTHENTICATION CHECK ---
        // First, check if the user is authenticated. Return 401 if not.
        if (!coordinator_id) {
            return res.status(401).json({ message: "Authentication failed. Please log in again." });
        }

        const { team_name, members, q_id, user_github_url, hackathon_id } = req.body;

        // 2. --- FIXED: VALIDATE ONLY THE REQUEST BODY ---
        // Now, validate the fields that are supposed to be in the body. Return 400 if invalid.
        if (!team_name || !members || members.length === 0 || !q_id || !user_github_url || !hackathon_id) {
            return res.status(400).json({ message: "Missing required fields, or no members selected for the team." });
        }

        // Check if a team with the same name already exists in THIS hackathon
        const existingTeam = await Team.findOne({ team_name, hackathon_id });
        if (existingTeam) {
            return res.status(400).json({ message: "A team with this name already exists in this hackathon." });
        }

        // 3. Create the new team document
        const newTeam = new Team({
            team_name,
            members,
            q_id,
            user_github_url,
            hackathon_id,
            coordinator_id // Use the secure ID
        });
        const savedTeam = await newTeam.save();

        // 4. CRITICAL STEP: Add the new team's ID to the Hackathon's 'teams' array
        await Hackathon.findByIdAndUpdate(
            hackathon_id,
            { $push: { teams: savedTeam._id } },
            { new: true }
        );
        
        // 5. Populate the response to send back full details
        const populatedTeam = await Team.findById(savedTeam._id)
            .populate('members', 'user_name')
            .populate('q_id', 'q_title');
            
        res.status(201).json({ message: 'Team created successfully!', team: populatedTeam });

    } catch (error) {
        console.error("Error in createTeam:", error);
        res.status(500).json({ message: 'Server error while creating team', error: error.message });
    }
};

// --- GET ALL TEAMS ---
export const getTeams = async (req, res) => {
    try {
        const teams = await Team.find()
            .populate('members', 'user_name') 
            .populate('q_id', 'q_title')      
            .populate('coordinator_id', 'user_name');
        res.status(200).json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teams', error: error.message });
    }
};

// --- GET THE LOGGED-IN USER'S TEAM ---
export const getMyTeam = async (req, res) => {
    try {
        // req.user is now the full user object from the middleware
        const userId = req.user._id;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const team = await Team.findOne({ members: userObjectId })
            .populate('members', 'user_name')
            .populate('q_id')
            .populate('coordinator_id', 'user_name');

        if (!team) {
            return res.status(404).json({ message: "You have not been assigned to a team yet." });
        }

        res.status(200).json(team);

    } catch (error) {
        console.error("Error in getMyTeam controller:", error);
        res.status(500).json({ message: "Server error while fetching your team." });
    }
};
// --- GET TEAM BY ID ---
export const getTeamById = async (req, res) => {
    try {
        const { id } = req.params;
        const team = await Team.findById(id)
            .populate('members', 'user_name user_email')
            .populate('q_id');

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.status(200).json(team);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching team', error: error.message });
    }
};

// --- UPDATE TEAM ---
export const updateTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedTeam = await Team.findByIdAndUpdate(id, updateData, { 
            new: true, 
            runValidators: true 
        }).populate('members', 'user_name user_email')
          .populate('q_id');

        if (!updatedTeam) {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.status(200).json({ message: 'Team updated successfully', team: updatedTeam });
    } catch (error) {
        res.status(500).json({ message: 'Error updating team', error: error.message });
    }
};

// --- DELETE TEAM ---
export const deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTeam = await Team.findByIdAndDelete(id);

        if (!deletedTeam) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        await Hackathon.findByIdAndUpdate(
            deletedTeam.hackathon_id,
            { $pull: { teams: deletedTeam._id } }
        );

        res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting team', error: error.message });
    }
};