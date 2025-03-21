// api/fees.js
import mongoose from 'mongoose';
import { Fee, checkMongoDBConnection } from './utils';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log('MongoDB is not connected. Returning empty fees list.');
                return res.json([]);
            }
            console.log('Fetching fees from MongoDB...');
            const fees = await Fee.find().lean().exec();
            console.log(`Fetched ${fees.length} fees`);
            res.json(fees);
        } catch (error) {
            console.error('Error fetching fees:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch fees' });
        }
    } else if (req.method === 'POST') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        try {
            console.log('Adding new fee:', req.body);
            const fee = new Fee(req.body);
            await fee.save();
            console.log('Fee added successfully:', fee);
            res.json(fee);
        } catch (error) {
            console.error('Error adding fee:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to add fee' });
        }
    } else if (req.method === 'PUT') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        const { id } = req.query;
        try {
            console.log(`Updating fee with ID ${id}:`, req.body);
            const fee = await Fee.findByIdAndUpdate(id, req.body, { new: true });
            if (!fee) {
                console.log(`Fee with ID ${id} not found`);
                return res.status(404).json({ error: 'Fee not found' });
            }
            console.log('Fee updated successfully:', fee);
            res.json(fee);
        } catch (error) {
            console.error('Error updating fee:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to update fee' });
        }
    } else if (req.method === 'DELETE') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        const { id } = req.query;
        try {
            console.log(`Deleting fee with ID ${id}`);
            const fee = await Fee.findByIdAndDelete(id);
            if (!fee) {
                console.log(`Fee with ID ${id} not found`);
                return res.status(404).json({ error: 'Fee not found' });
            }
            console.log('Fee deleted successfully');
            res.status(204).end();
        } catch (error) {
            console.error('Error deleting fee:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to delete fee' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}