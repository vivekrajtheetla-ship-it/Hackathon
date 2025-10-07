import Evaluation from '../models/evaluation.model.js';
import Score from '../models/score.model.js';
import Team from '../models/team.model.js';
import User from '../models/user.model.js';
import Hackathon from '../models/hackathon.model.js';
import { updateHackathonStatuses, performCompleteCleanup } from './hackathon.controller.js';
import mongoose from 'mongoose';

// Get evaluator dashboard data
export const getEvaluatorDashboardData = async (req, res) => {
    try {
        const evaluatorId = req.user._id;
        console.log('Evaluator dashboard request from:', evaluatorId);
        
        // Skip status update for faster loading - status updates happen periodically via server.js
        
        // Get evaluator's current hackathon
        const evaluator = await User.findById(evaluatorId);
        
        if (!evaluator) {
            return res.status(404).json({ message: "Evaluator not found" });
        }
        
        // Find evaluator's hackathon (current or recent completed without winners)
        const hackathonId = await findEvaluatorHackathon(evaluatorId);
        
        if (!hackathonId) {
            return res.status(404).json({ message: "No hackathon assigned to evaluator" });
        }

        // Get hackathon details
        const hackathon = await Hackathon.findById(hackathonId);
        if (!hackathon) {
            return res.status(404).json({ message: "Hackathon not found" });
        }

        // Get all teams in this hackathon with minimal population for better performance
        const teams = await Team.find({ hackathon_id: hackathonId })
            .populate('members', 'user_name user_email')
            .populate('q_id', 'q_title q_description evaluationCriteria')
            .populate('coordinator_id', 'user_name')
            .populate('assigned_evaluator', 'user_name')
            .lean(); // Use lean() for better performance

        // Get all evaluations for this hackathon (for all teams view)
        const allEvaluations = await Evaluation.find({ h_id: hackathonId })
            .populate('t_id', 'team_name github_submission')
            .populate({
                path: 'scores',
                populate: {
                    path: 'evaluator_id',
                    select: 'user_name'
                }
            })
            .lean();

        // Get my evaluations (teams I've scored)
        const myEvaluationsQuery = await Evaluation.find({ h_id: hackathonId })
            .populate('t_id', 'team_name github_submission')
            .populate({
                path: 'scores',
                match: { evaluator_id: evaluatorId },
                populate: {
                    path: 'evaluator_id',
                    select: 'user_name'
                }
            })
            .lean();

        const myEvaluations = myEvaluationsQuery
            .filter(evaluation => evaluation.scores && evaluation.scores.length > 0)
            .map(evaluation => {
                const myScore = evaluation.scores[0];
                return {
                    _id: evaluation._id,
                    team_id: evaluation.t_id,
                    scores: myScore ? myScore.criterionScores : [],
                    feedback: myScore ? myScore.feedback : '',
                    total_score: myScore ? myScore.total_score : 0
                };
            });

        // Calculate all team scores with average from all evaluators
        const allTeamScores = allEvaluations.map(evaluation => {
            if (evaluation.scores && evaluation.scores.length > 0) {
                const totalScore = evaluation.scores.reduce((sum, score) => sum + score.total_score, 0);
                const averageScore = totalScore / evaluation.scores.length;
                return {
                    _id: evaluation._id,
                    team_id: evaluation.t_id,
                    total_score: parseFloat(averageScore.toFixed(2)),
                    evaluation_count: evaluation.scores.length,
                    evaluators: evaluation.scores.map(score => score.evaluator_id.user_name)
                };
            }
            return {
                _id: evaluation._id,
                team_id: evaluation.t_id,
                total_score: 0,
                evaluation_count: 0,
                evaluators: []
            };
        });

        // Check if all teams have been evaluated by at least one evaluator
        const allTeamsEvaluated = teams.every(team => 
            allEvaluations.some(evaluation => 
                evaluation.t_id._id.toString() === team._id.toString() && 
                evaluation.scores && 
                evaluation.scores.length > 0
            )
        );

        // Get stats with optimized queries
        const [participants, coordinators, evaluators, teamsList] = await Promise.all([
            User.find({ current_hackathon: hackathonId, role_name: 'participant' }).select('user_name user_email').lean(),
            User.find({ current_hackathon: hackathonId, role_name: 'coordinator' }).select('user_name user_email').lean(),
            User.find({ current_hackathon: hackathonId, role_name: 'evaluator' }).select('user_name user_email').lean(),
            Team.find({ hackathon_id: hackathonId }).select('team_name members').populate('members', 'user_name').lean()
        ]);

        const stats = {
            total_teams: teams.length,
            total_participants: participants.length,
            total_coordinators: coordinators.length,
            total_evaluators: evaluators.length,
            teamsList: teamsList,
            participantsList: participants,
            coordinatorsList: coordinators,
            evaluatorsList: evaluators
        };

        const dashboardData = {
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
            stats,
            teams,
            myEvaluations,
            allTeamScores,
            allTeamsEvaluated
        };

        res.status(200).json(dashboardData);
    } catch (error) {
        console.error("Error fetching evaluator dashboard data:", error);
        res.status(500).json({ message: "Server error while fetching dashboard data", error: error.message });
    }
};

// Submit or update evaluation
export const submitEvaluation = async (req, res) => {
    try {
        const evaluatorId = req.user._id;
        const { team_id, scores, feedback } = req.body;

        // Validate input
        if (!team_id || !scores || !Array.isArray(scores)) {
            return res.status(400).json({ message: "Team ID and scores array are required" });
        }

        // Get evaluator's hackathon
        const evaluator = await User.findById(evaluatorId);
        if (!evaluator || !evaluator.current_hackathon) {
            return res.status(404).json({ message: "No hackathon assigned to evaluator" });
        }

        const hackathonId = evaluator.current_hackathon;

        // Verify team belongs to the same hackathon
        const team = await Team.findById(team_id);
        if (!team || team.hackathon_id.toString() !== hackathonId.toString()) {
            return res.status(404).json({ message: "Team not found or not in your assigned hackathon" });
        }

        // Calculate total score
        const totalScore = scores.reduce((sum, score) => sum + score.score, 0) / scores.length;

        // Check if score already exists for this evaluator and team
        let existingScore = await Score.findOne({ evaluator_id: evaluatorId });
        
        // Find if this evaluator has scored this team before by checking evaluations
        let evaluation = await Evaluation.findOne({ 
            h_id: hackathonId, 
            t_id: team_id 
        }).populate('scores');

        let scoreDoc;

        if (evaluation) {
            // Check if this evaluator already has a score for this team
            const existingScoreInEval = evaluation.scores.find(score => 
                score.evaluator_id && score.evaluator_id.toString() === evaluatorId
            );

            if (existingScoreInEval) {
                // Update existing score
                await Score.findByIdAndUpdate(existingScoreInEval._id, {
                    criterionScores: scores.map(s => ({
                        criterionName: s.criteriaName,
                        score: s.score
                    })),
                    total_score: totalScore,
                    feedback: feedback
                });
                scoreDoc = existingScoreInEval;
            } else {
                // Create new score and add to existing evaluation
                scoreDoc = new Score({
                    criterionScores: scores.map(s => ({
                        criterionName: s.criteriaName,
                        score: s.score
                    })),
                    evaluator_id: evaluatorId,
                    total_score: totalScore,
                    feedback: feedback
                });
                await scoreDoc.save();

                // Add score to evaluation
                evaluation.scores.push(scoreDoc._id);
                await evaluation.save();
            }
        } else {
            // Create new score
            scoreDoc = new Score({
                criterionScores: scores.map(s => ({
                    criterionName: s.criteriaName,
                    score: s.score
                })),
                evaluator_id: evaluatorId,
                total_score: totalScore,
                feedback: feedback
            });
            await scoreDoc.save();

            // Create new evaluation
            evaluation = new Evaluation({
                h_id: hackathonId,
                q_id: team.q_id,
                t_id: team_id,
                scores: [scoreDoc._id]
            });
            await evaluation.save();
        }

        // Mark team as evaluation completed
        await Team.findByIdAndUpdate(team_id, {
            evaluation_status: 'completed',
            assigned_evaluator: evaluatorId // Keep the evaluator who completed it
        });

        res.status(200).json({
            message: "Evaluation submitted successfully",
            score: scoreDoc
        });

    } catch (error) {
        console.error("Error submitting evaluation:", error);
        res.status(500).json({ message: "Server error while submitting evaluation", error: error.message });
    }
};

// Get all evaluations for a hackathon (for scoreboard)
export const getAllEvaluations = async (req, res) => {
    try {
        const evaluatorId = req.user._id;
        
        // Get evaluator's hackathon
        const evaluator = await User.findById(evaluatorId);
        if (!evaluator || !evaluator.current_hackathon) {
            return res.status(404).json({ message: "No hackathon assigned to evaluator" });
        }

        const hackathonId = evaluator.current_hackathon;

        // Get all evaluations for this hackathon with scores
        const evaluations = await Evaluation.find({ h_id: hackathonId })
            .populate('t_id', 'team_name github_submission')
            .populate({
                path: 't_id',
                populate: {
                    path: 'q_id',
                    select: 'q_title'
                }
            })
            .populate({
                path: 'scores',
                populate: {
                    path: 'evaluator_id',
                    select: 'user_name'
                }
            });

        // Calculate average scores for each team
        const teamScores = evaluations.map(evaluation => {
            if (evaluation.scores && evaluation.scores.length > 0) {
                const avgScore = evaluation.scores.reduce((sum, score) => sum + score.total_score, 0) / evaluation.scores.length;
                return {
                    _id: evaluation._id,
                    team_id: evaluation.t_id,
                    scores: [{
                        criteriaName: 'Average',
                        score: avgScore
                    }],
                    total_score: avgScore
                };
            }
            return null;
        }).filter(Boolean);

        res.status(200).json(teamScores);
    } catch (error) {
        console.error("Error fetching all evaluations:", error);
        res.status(500).json({ message: "Server error while fetching evaluations", error: error.message });
    }
};

// Get evaluations by current evaluator
export const getMyEvaluations = async (req, res) => {
    try {
        const evaluatorId = req.user._id;
        
        // Get evaluator's hackathon
        const evaluator = await User.findById(evaluatorId);
        if (!evaluator || !evaluator.current_hackathon) {
            return res.status(404).json({ message: "No hackathon assigned to evaluator" });
        }

        const hackathonId = evaluator.current_hackathon;

        // Get all evaluations for this hackathon
        const evaluations = await Evaluation.find({ h_id: hackathonId })
            .populate('t_id', 'team_name github_submission')
            .populate({
                path: 't_id',
                populate: {
                    path: 'q_id',
                    select: 'q_title'
                }
            })
            .populate({
                path: 'scores',
                populate: {
                    path: 'evaluator_id',
                    select: 'user_name'
                }
            });

        // Filter to only evaluations where this evaluator has scored
        const myEvaluations = evaluations.filter(evaluation => 
            evaluation.scores.some(score => score.evaluator_id._id.toString() === evaluatorId)
        ).map(evaluation => {
            const myScore = evaluation.scores.find(score => 
                score.evaluator_id._id.toString() === evaluatorId
            );
            return {
                _id: evaluation._id,
                team_id: evaluation.t_id,
                scores: myScore ? myScore.criterionScores : [],
                feedback: myScore ? myScore.feedback : '',
                total_score: myScore ? myScore.total_score : 0
            };
        });

        res.status(200).json(myEvaluations);
    } catch (error) {
        console.error("Error fetching my evaluations:", error);
        res.status(500).json({ message: "Server error while fetching evaluations", error: error.message });
    }
};

// Get evaluation by ID
export const getEvaluationById = async (req, res) => {
    try {
        const { id } = req.params;
        const evaluatorId = req.user._id;

        const evaluation = await Evaluation.findOne({
            _id: id,
            evaluator_id: evaluatorId
        })
        .populate('team_id')
        .populate('evaluator_id', 'user_name');

        if (!evaluation) {
            return res.status(404).json({ message: "Evaluation not found" });
        }

        res.status(200).json(evaluation);
    } catch (error) {
        console.error("Error fetching evaluation:", error);
        res.status(500).json({ message: "Server error while fetching evaluation", error: error.message });
    }
};

// Update evaluation
export const updateEvaluation = async (req, res) => {
    try {
        const { id } = req.params;
        const evaluatorId = req.user._id;
        const { scores, feedback } = req.body;

        const evaluation = await Evaluation.findOne({
            _id: id,
            evaluator_id: evaluatorId
        });

        if (!evaluation) {
            return res.status(404).json({ message: "Evaluation not found" });
        }

        evaluation.scores = scores || evaluation.scores;
        evaluation.feedback = feedback || evaluation.feedback;
        evaluation.evaluated_at = new Date();

        await evaluation.save();

        const populatedEvaluation = await Evaluation.findById(evaluation._id)
            .populate('team_id', 'team_name')
            .populate('evaluator_id', 'user_name');

        res.status(200).json({
            message: "Evaluation updated successfully",
            evaluation: populatedEvaluation
        });

    } catch (error) {
        console.error("Error updating evaluation:", error);
        res.status(500).json({ message: "Server error while updating evaluation", error: error.message });
    }
};

// Delete evaluation
export const deleteEvaluation = async (req, res) => {
    try {
        const { id } = req.params;
        const evaluatorId = req.user._id;

        const evaluation = await Evaluation.findOneAndDelete({
            _id: id,
            evaluator_id: evaluatorId
        });

        if (!evaluation) {
            return res.status(404).json({ message: "Evaluation not found" });
        }

        res.status(200).json({ message: "Evaluation deleted successfully" });
    } catch (error) {
        console.error("Error deleting evaluation:", error);
        res.status(500).json({ message: "Server error while deleting evaluation", error: error.message });
    }
};

// Select team for evaluation (exclusive lock)
export const selectTeamForEvaluation = async (req, res) => {
    try {
        const evaluatorId = req.user._id;
        const { team_id } = req.body;

        if (!team_id) {
            return res.status(400).json({ message: "Team ID is required" });
        }

        // Get evaluator's hackathon
        const evaluator = await User.findById(evaluatorId);
        if (!evaluator || !evaluator.current_hackathon) {
            return res.status(404).json({ message: "No hackathon assigned to evaluator" });
        }

        const hackathonId = evaluator.current_hackathon;

        // Find the team
        const team = await Team.findById(team_id);
        if (!team || team.hackathon_id.toString() !== hackathonId.toString()) {
            return res.status(404).json({ message: "Team not found or not in your assigned hackathon" });
        }

        // Check if team is already being evaluated by someone else
        if (team.evaluation_status === 'being_evaluated' && 
            team.assigned_evaluator && 
            team.assigned_evaluator.toString() !== evaluatorId) {
            return res.status(409).json({ 
                message: "Team is already being evaluated by another evaluator",
                assigned_evaluator: team.assigned_evaluator
            });
        }

        // Check if team is already completed
        if (team.evaluation_status === 'completed') {
            return res.status(409).json({ 
                message: "Team evaluation has already been completed"
            });
        }

        // Assign team to this evaluator
        team.assigned_evaluator = evaluatorId;
        team.evaluation_status = 'being_evaluated';
        team.evaluation_started_at = new Date();
        await team.save();

        res.status(200).json({
            message: "Team selected for evaluation successfully",
            team: {
                _id: team._id,
                team_name: team.team_name,
                evaluation_status: team.evaluation_status,
                assigned_evaluator: team.assigned_evaluator
            }
        });

    } catch (error) {
        console.error("Error selecting team for evaluation:", error);
        res.status(500).json({ message: "Server error while selecting team", error: error.message });
    }
};

// Release team from evaluation
export const releaseTeamFromEvaluation = async (req, res) => {
    try {
        const evaluatorId = req.user._id;
        const { team_id } = req.body;

        if (!team_id) {
            return res.status(400).json({ message: "Team ID is required" });
        }

        // Find the team
        const team = await Team.findById(team_id);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Check if this evaluator has the team assigned
        if (team.assigned_evaluator && team.assigned_evaluator.toString() !== evaluatorId) {
            return res.status(403).json({ 
                message: "You can only release teams assigned to you"
            });
        }

        // Release the team
        team.assigned_evaluator = null;
        team.evaluation_status = 'available';
        team.evaluation_started_at = null;
        await team.save();

        res.status(200).json({
            message: "Team released from evaluation successfully",
            team: {
                _id: team._id,
                team_name: team.team_name,
                evaluation_status: team.evaluation_status,
                assigned_evaluator: team.assigned_evaluator
            }
        });

    } catch (error) {
        console.error("Error releasing team from evaluation:", error);
        res.status(500).json({ message: "Server error while releasing team", error: error.message });
    }
};

// Cleanup function to release teams that have been locked for too long
export const cleanupStaleLocks = async () => {
    try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
        
        const staleTeams = await Team.find({
            evaluation_status: 'being_evaluated',
            evaluation_started_at: { $lt: thirtyMinutesAgo }
        });

        for (const team of staleTeams) {
            team.assigned_evaluator = null;
            team.evaluation_status = 'available';
            team.evaluation_started_at = null;
            await team.save();
        }

        return staleTeams.length;
    } catch (error) {
        console.error("Error cleaning up stale locks:", error);
        return 0;
    }
};

// Auto-cleanup stale locks every 10 minutes
setInterval(cleanupStaleLocks, 10 * 60 * 1000);

// Announce winners
export const announceWinners = async (req, res) => {
    try {
        const evaluatorId = req.user._id;
        const { hackathon_id, firstPlace, secondPlace, thirdPlace } = req.body;

        // Validate input
        if (!hackathon_id || !firstPlace || !secondPlace || !thirdPlace) {
            return res.status(400).json({ message: "All winner positions are required" });
        }

        // Get evaluator's hackathon
        const evaluator = await User.findById(evaluatorId);
        if (!evaluator || !evaluator.current_hackathon) {
            return res.status(404).json({ message: "No hackathon assigned to evaluator" });
        }

        // Verify hackathon belongs to the evaluator
        if (evaluator.current_hackathon.toString() !== hackathon_id.toString()) {
            return res.status(403).json({ message: "You can only announce winners for your assigned hackathon" });
        }

        // Get hackathon details
        const hackathon = await Hackathon.findById(hackathon_id);
        if (!hackathon) {
            return res.status(404).json({ message: "Hackathon not found" });
        }

        // Check if winners are already announced
        if (hackathon.winners && (hackathon.winners.firstPlace || hackathon.winners.secondPlace || hackathon.winners.thirdPlace)) {
            return res.status(409).json({ message: "Winners have already been announced for this hackathon" });
        }

        // Check if there are any evaluations for this hackathon
        const evaluationCount = await Evaluation.countDocuments({ h_id: hackathon_id });
        if (evaluationCount === 0) {
            return res.status(400).json({ 
                message: "Cannot announce winners without any evaluations. Please evaluate teams first." 
            });
        }

        // Verify all teams exist
        const [firstTeam, secondTeam, thirdTeam] = await Promise.all([
            Team.findById(firstPlace),
            Team.findById(secondPlace),
            Team.findById(thirdPlace)
        ]);

        if (!firstTeam || !secondTeam || !thirdTeam) {
            return res.status(404).json({ message: "One or more selected teams not found" });
        }

        // Verify all teams belong to this hackathon
        if (firstTeam.hackathon_id.toString() !== hackathon_id.toString() ||
            secondTeam.hackathon_id.toString() !== hackathon_id.toString() ||
            thirdTeam.hackathon_id.toString() !== hackathon_id.toString()) {
            return res.status(400).json({ message: "All selected teams must belong to this hackathon" });
        }

        // Update hackathon with winners
        const updatedHackathon = await Hackathon.findByIdAndUpdate(
            hackathon_id,
            {
                $set: {
                    'winners.firstPlace': firstPlace,
                    'winners.secondPlace': secondPlace,
                    'winners.thirdPlace': thirdPlace,
                    'status': 'completed',
                    'winnersAnnouncedAt': new Date()
                }
            },
            { new: true }
        ).populate('winners.firstPlace winners.secondPlace winners.thirdPlace', 'team_name members')
         .populate({
             path: 'winners.firstPlace winners.secondPlace winners.thirdPlace',
             populate: {
                 path: 'members',
                 select: 'user_name'
             }
         });

        // Perform complete cleanup including role reversion
        const cleanupStats = await performCompleteCleanup(hackathon_id);
        cleanupStats.trigger = 'winner_announcement';
        
        console.log(`Complete cleanup performed for hackathon: ${hackathon_id}`, cleanupStats);

        res.status(200).json({
            message: "Winners announced successfully!",
            hackathon: updatedHackathon,
            winners: {
                firstPlace: updatedHackathon.winners.firstPlace,
                secondPlace: updatedHackathon.winners.secondPlace,
                thirdPlace: updatedHackathon.winners.thirdPlace
            },
            cleanupStatistics: cleanupStats
        });

    } catch (error) {
        console.error("Error announcing winners:", error);
        res.status(500).json({ message: "Server error while announcing winners", error: error.message });
    }
};

// Helper function to find evaluator's hackathon (current or recent completed without winners)
const findEvaluatorHackathon = async (evaluatorId) => {
    const evaluator = await User.findById(evaluatorId);
    if (!evaluator) return null;
    
    // If has current hackathon, use it
    if (evaluator.current_hackathon) {
        return evaluator.current_hackathon;
    }
    
    // Find recent completed hackathon without winners where this evaluator has connection
    const recentHackathons = await Hackathon.find({
        status: 'completed',
        $and: [
            { $or: [
                { winners: { $exists: false } },
                { winners: null },
                { 'winners.firstPlace': { $exists: false } },
                { 'winners.firstPlace': null }
            ]}
        ]
    }).sort({ end_datetime: -1 }).limit(5); // Check last 5 completed hackathons
    
    for (const hackathon of recentHackathons) {
        // Check if this evaluator has any evaluations in this hackathon
        const hasEvaluations = await Evaluation.exists({ 
            h_id: hackathon._id,
            scores: { 
                $elemMatch: { 
                    evaluator_id: evaluatorId 
                } 
            }
        });
        
        // Or check if there are teams that still need evaluation
        const teamsNeedingEvaluation = await Team.exists({
            hackathon_id: hackathon._id,
            evaluation_status: { $ne: 'completed' }
        });
        
        // Or check if this evaluator was previously assigned to teams in this hackathon
        const wasAssignedToTeams = await Team.exists({
            hackathon_id: hackathon._id,
            assigned_evaluator: evaluatorId
        });
        
        if (hasEvaluations || teamsNeedingEvaluation || wasAssignedToTeams) {
            return hackathon._id;
        }
    }
    
    return null;
};

// Endpoint to reconnect evaluator to their hackathon (for cases where cleanup ran early)
export const reconnectEvaluatorToHackathon = async (req, res) => {
    try {
        const evaluatorId = req.user._id;
        
        const hackathonId = await findEvaluatorHackathon(evaluatorId);
        
        if (!hackathonId) {
            return res.status(404).json({ 
                message: "No available hackathon found for reconnection" 
            });
        }
        
        // Reconnect evaluator to the hackathon
        await User.findByIdAndUpdate(evaluatorId, {
            current_hackathon: hackathonId,
            role_name: 'evaluator' // Ensure role is set correctly
        });
        
        const hackathon = await Hackathon.findById(hackathonId);
        
        res.status(200).json({
            message: "Successfully reconnected to hackathon",
            hackathon: {
                _id: hackathon._id,
                hackathon_name: hackathon.hackathon_name,
                status: hackathon.status
            }
        });
        
    } catch (error) {
        console.error("Error reconnecting evaluator to hackathon:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Debug endpoint to check evaluator status
export const getEvaluatorStatus = async (req, res) => {
    try {
        const evaluatorId = req.user._id;
        console.log('Evaluator status request from:', evaluatorId);
        
        // Update hackathon statuses first
        try {
            await updateHackathonStatuses();
        } catch (error) {
            console.error('Error updating hackathon statuses:', error);
            // Continue without status update if it fails
        }
        
        const evaluator = await User.findById(evaluatorId);
        
        if (!evaluator) {
            return res.status(404).json({ message: "Evaluator not found" });
        }

        // Find evaluator's hackathon (current or recent completed without winners)
        const effectiveHackathonId = await findEvaluatorHackathon(evaluatorId);
        
        let hackathonDetails = null;
        if (effectiveHackathonId) {
            hackathonDetails = await Hackathon.findById(effectiveHackathonId);
        }
        
        res.status(200).json({
            evaluator: {
                id: evaluator._id,
                name: evaluator.user_name,
                email: evaluator.user_email,
                role: evaluator.role_name,
                current_hackathon: effectiveHackathonId, // Use effective hackathon ID
                hackathon_details: hackathonDetails ? {
                    _id: hackathonDetails._id,
                    hackathon_name: hackathonDetails.hackathon_name,
                    start_datetime: hackathonDetails.start_datetime,
                    end_datetime: hackathonDetails.end_datetime,
                    status: hackathonDetails.status,
                    winners: hackathonDetails.winners,
                    winnersAnnouncedAt: hackathonDetails.winnersAnnouncedAt
                } : null
            }
        });
    } catch (error) {
        console.error("Error fetching evaluator status:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};