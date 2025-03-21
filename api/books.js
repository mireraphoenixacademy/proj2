// api/books.js
import mongoose from 'mongoose';
import { Book, checkMongoDBConnection } from './utils';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log('MongoDB is not connected. Returning empty books list.');
                return res.json([]);
            }
            console.log('Fetching books from MongoDB...');
            const books = await Book.find().lean().exec();
            console.log(`Fetched ${books.length} books`);
            res.json(books);
        } catch (error) {
            console.error('Error fetching books:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch books' });
        }
    } else if (req.method === 'POST') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        try {
            console.log('Adding new book:', req.body);
            const book = new Book(req.body);
            await book.save();
            console.log('Book added successfully:', book);
            res.json(book);
        } catch (error) {
            console.error('Error adding book:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to add book' });
        }
    } else if (req.method === 'PUT') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        const { id } = req.query;
        try {
            console.log(`Updating book with ID ${id}:`, req.body);
            const book = await Book.findByIdAndUpdate(id, req.body, { new: true });
            if (!book) {
                console.log(`Book with ID ${id} not found`);
                return res.status(404).json({ error: 'Book not found' });
            }
            console.log('Book updated successfully:', book);
            res.json(book);
        } catch (error) {
            console.error('Error updating book:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to update book' });
        }
    } else if (req.method === 'DELETE') {
        const connectionError = checkMongoDBConnection(req, res);
        if (connectionError) return;

        const { id } = req.query;
        try {
            console.log(`Deleting book with ID ${id}`);
            const book = await Book.findByIdAndDelete(id);
            if (!book) {
                console.log(`Book with ID ${id} not found`);
                return res.status(404).json({ error: 'Book not found' });
            }
            console.log('Book deleted successfully');
            res.status(204).end();
        } catch (error) {
            console.error('Error deleting book:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to delete book' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}