// api/termSettings.js
import mongoose from 'mongoose';
import { TermSettings, checkMongoDBConnection } from './utils';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log('MongoDB is not connected. Returning default term settings.');
                return res.json({ currentTerm: 'Term 1', currentYear: new Date().getFullYear() });
            }
            console.log('Fetching term settings from MongoDB...');
            const termSettings = await TermSettings.findOne().lean().exec();
            console.log('Term settings fetched:', termSettings);
            res.json(termSettings || { currentTerm: 'Term 1', currentYear: new Date().getFullYear() });
        } catch (error) {
            console.error('Error fetching term settings:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch term settings' });
        }
    } else if (req.method === 'POST') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        try {
            console.log('Saving term settings:', req.body);
            let termSettings = await TermSettings.findOne();
            if (termSettings) {
                console.log('Updating existing term settings...');
                termSettings = await TermSettings.findOneAndUpdate({}, req.body, { new: true });
            } else {
                console.log('Creating new term settings...');
                termSettings = new TermSettings(req.body);
                await termSettings.save();
            }
            console.log('Term settings saved successfully:', termSettings);
            res.json(termSettings);
        } catch (error) {
            console.error('Error saving term settings:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to save term settings' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}