import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Configure dotenv to be silent
dotenv.config({ quiet: true });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        console.log('Server will continue without database connection...');
        // Don't exit, let server start anyway for testing
    }
};

export default connectDB;