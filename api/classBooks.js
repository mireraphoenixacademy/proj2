// api/classBooks.js
import mongoose from 'mongoose';
import { ClassBook, checkMongoDBConnection } from './utils';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log('MongoDB is not connected. Returning empty class books list.');
                return res.json([]);
            }
            console.log('Fetching class books from MongoDB...');
            const classBooks = await ClassBook.find().lean().exec();
            console.log(`Fetched ${classBooks.length} class books`);
            res.json(classBooks);
        } catch (error) {
            console.error('Error fetching class books:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch class books' });
        }
    } else if (req.method === 'POST') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        try {
            console.log('Adding new class book:', req.body);
            const classBook = new ClassBook(req.body);
            await classBook.save();
            console.log('Class book added successfully:', classBook);
            res.json(classBook);
        } catch (error) {
            console.error('Error adding class book:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to add class book' });
        }
    } else if (req.method === 'PUT') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        const { id } = req.query;
        try {
            console.log(`Updating class book with ID ${id}:`, req.body);
            const classBook = await ClassBook.findByIdAndUpdate(id, req.body, { new: true });
            if (!classBook) {
                console.log(`Class book with ID ${id} not found`);
                return res.status(404).json({ error: 'Class book not found' });
            }
            console.log('Class book updated successfully:', classBook);
            res.json(classBook);
        } catch (error) {
            console.error('Error updating class book:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to update class book' });
        }
    } else if (req.method === 'DELETE') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        const { id } = req.query;
        try {
            console.log(`Deleting class book with ID ${id}`);
            const classBook = await ClassBook.findByIdAndDelete(id);
            if (!classBook) {
                console.log(`Class book with ID ${id} not found`);
                return res.status(404).json({ error: 'Class book not found' });
            }
            console.log('Class book deleted successfully');
            res.status(204).end();
        } catch (error) {
            console.error('Error deleting class book:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to delete class book' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}