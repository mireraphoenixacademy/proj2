// api/learners.js
import mongoose from 'mongoose';
import { Learner, checkMongoDBConnection } from './utils';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log('MongoDB is not connected. Returning empty learners list.');
                return res.json([]);
            }
            console.log('Fetching learners from MongoDB...');
            const learners = await Learner.find().lean().exec();
            console.log(`Fetched ${learners.length} learners`);
            res.json(learners);
        } catch (error) {
            console.error('Error fetching learners:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch learners' });
        }
    } else if (req.method === 'POST') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        try {
            console.log('Adding new learner:', req.body);
            const learner = new Learner(req.body);
            await learner.validate();
            console.log('Learner validation passed');
            await learner.save();
            console.log('Learner added successfully:', learner);
            res.json(learner);
        } catch (error) {
            console.error('Error adding learner:', error.message, error.stack);
            if (error.name === 'ValidationError') {
                console.error('Validation errors:', error.errors);
            }
            res.status(500).json({ error: 'Failed to add learner', details: error.message });
        }
    } else if (req.method === 'PUT') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        const { id } = req.query;
        try {
            console.log(`Updating learner with ID ${id}:`, req.body);
            const learner = await Learner.findByIdAndUpdate(id, req.body, { new: true });
            if (!learner) {
                console.log(`Learner with ID ${id} not found`);
                return res.status(404).json({ error: 'Learner not found' });
            }
            console.log('Learner updated successfully:', learner);
            res.json(learner);
        } catch (error) {
            console.error('Error updating learner:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to update learner' });
        }
    } else if (req.method === 'DELETE') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        const { id } = req.query;
        try {
            console.log(`Deleting learner with ID ${id}`);
            const learner = await Learner.findByIdAndDelete(id);
            if (!learner) {
                console.log(`Learner with ID ${id} not found`);
                return res.status(404).json({ error: 'Learner not found' });
            }
            console.log('Learner deleted successfully');
            res.status(204).end();
        } catch (error) {
            console.error('Error deleting learner:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to delete learner' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}