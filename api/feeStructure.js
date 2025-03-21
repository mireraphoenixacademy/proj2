// api/feeStructure.js
import mongoose from 'mongoose';
import { FeeStructure, checkMongoDBConnection } from './utils';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log('MongoDB is not connected. Returning empty fee structure.');
                return res.json({});
            }
            console.log('Fetching fee structure from MongoDB...');
            const feeStructure = await FeeStructure.findOne().lean().exec();
            console.log('Fee structure fetched:', feeStructure);
            res.json(feeStructure || {});
        } catch (error) {
            console.error('Error fetching fee structure:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch fee structure' });
        }
    } else if (req.method === 'POST') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        try {
            console.log('Saving fee structure:', req.body);
            let feeStructure = await FeeStructure.findOne();
            if (feeStructure) {
                console.log('Updating existing fee structure...');
                feeStructure = await FeeStructure.findOneAndUpdate({}, req.body, { new: true });
            } else {
                console.log('Creating new fee structure...');
                feeStructure = new FeeStructure(req.body);
                await feeStructure.save();
            }
            console.log('Fee structure saved successfully:', feeStructure);
            res.json(feeStructure);
        } catch (error) {
            console.error('Error saving fee structure:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to save fee structure' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}