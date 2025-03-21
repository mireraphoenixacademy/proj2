// api/learnerArchives.js
import mongoose from 'mongoose';
import { LearnerArchive } from './utils';

export default async function handler(req, res) {
    const { year } = req.query;

    if (req.method === 'GET' && !year) {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log('MongoDB is not connected. Returning empty archived years list.');
                return res.json([]);
            }
            console.log('Fetching archived years from MongoDB...');
            const archives = await LearnerArchive.find({}, 'year').lean().exec();
            const years = archives.map(archive => archive.year);
            console.log(`Fetched archived years: ${years}`);
            res.json(years);
        } catch (error) {
            console.error('Error fetching archived years:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch archived years' });
        }
    } else if (req.method === 'GET' && year) {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log('MongoDB is not connected. Returning empty archived learners list.');
                return res.json([]);
            }
            console.log(`Fetching archived learners for year ${year}...`);
            const archive = await LearnerArchive.findOne({ year: parseInt(year) }).lean().exec();
            if (!archive) {
                console.log(`Archive for year ${year} not found`);
                return res.status(404).json({ error: 'Archive not found' });
            }
            console.log(`Fetched archived learners for year ${year}`);
            res.json(archive.learners);
        } catch (error) {
            console.error('Error fetching archived learners:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch archived learners' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}