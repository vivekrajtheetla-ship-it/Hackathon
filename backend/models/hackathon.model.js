import mongoose from 'mongoose';
const { Schema } = mongoose;

const hackathonSchema = new Schema({
    hackathon_name: { type: String, required: true },
    start_datetime: { type: Date, required: true },
    // --- ⬇️ ADD THIS NEW FIELD ⬇️ ---
    mid_submission_datetime: { type: Date },
    end_datetime: { type: Date, required: true },
    registrationDeadline: { type: Date },
    venue: { type: String, required: true },
    status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    coordinators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    evaluators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    winners: {
        firstPlace: { type: Schema.Types.ObjectId, ref: 'Team' },
        secondPlace: { type: Schema.Types.ObjectId, ref: 'Team' },
        thirdPlace: { type: Schema.Types.ObjectId, ref: 'Team' }
    },
    winnersAnnouncedAt: { type: Date }
}, { timestamps: true });

const Hackathon = mongoose.model('Hackathon', hackathonSchema);

export default Hackathon;