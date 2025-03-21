// api/health.js
import mongoose from 'mongoose';

export default async function handler(req, res) {
    try {
        const dbState = mongoose.connection.readyState;
        res.status(200).json({
            status: 'OK',
            message: 'Server is running',
            mongoDBConnected: dbState === 1 ? 'Yes' : 'No'
        });
    } catch (error) {
        console.error('Health check failed:', error.message);
        res.status(500).json({ status: 'ERROR', message: 'Health check failed', error: error.message });
    }
}