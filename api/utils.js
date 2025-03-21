// api/utils.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB Connection with Retry Logic
mongoose.set('strictQuery', false);

const connectToMongoDB = async () => {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://mpaAdmin:sysAdmin368@cluster0.k9fva.mongodb.net/school_management?retryWrites=true&w=majority&appName=Cluster0';
    const maxRetries = 5;
    let attempt = 1;

    while (attempt <= maxRetries) {
        try {
            console.log(`Attempt ${attempt}/${maxRetries} - Connecting to MongoDB with URI:`, mongoURI.replace(/:([^:@]+)@/, ':****@'));
            await mongoose.connect(mongoURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 5000,
                connectTimeoutMS: 5000,
                maxPoolSize: 5,
                retryWrites: true,
            });
            console.log('Connected to MongoDB successfully');
            return true;
        } catch (error) {
            console.error(`Attempt ${attempt}/${maxRetries} - Failed to connect to MongoDB:`, error.message, error.stack);
            if (attempt === maxRetries) {
                console.error('Max retries reached. Proceeding without MongoDB connection...');
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempt++;
        }
    }
};

// Background reconnection loop
const startReconnectionLoop = () => {
    setInterval(async () => {
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB is disconnected. Attempting to reconnect...');
            await connectToMongoDB();
        }
    }, 30000);
};

// Initialize MongoDB connection
(async () => {
    const connected = await connectToMongoDB();
    if (!connected) {
        startReconnectionLoop();
    }
})();

// Models
const learnerSchema = new mongoose.Schema({
    admissionNo: { type: String, required: true },
    fullName: { type: String, required: true },
    gender: { type: String, required: true },
    dob: { type: String, required: true },
    grade: { type: String, required: true },
    assessmentNumber: { type: String },
    parentName: { type: String, required: true },
    parentPhone: { type: String, required: true },
    parentEmail: { type: String, required: true }
});

const feeSchema = new mongoose.Schema({
    admissionNo: { type: String, required: true },
    term: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    balance: { type: Number, required: true }
});

const bookSchema = new mongoose.Schema({
    admissionNo: { type: String, required: true },
    subject: { type: String, required: true },
    bookTitle: { type: String, required: true }
});

const classBookSchema = new mongoose.Schema({
    bookNumber: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    totalBooks: { type: Number, required: true }
});

const feeStructureSchema = new mongoose.Schema({
    playgroup: Number,
    pp1: Number,
    pp2: Number,
    grade1: Number,
    grade2: Number,
    grade3: Number,
    grade4: Number,
    grade5: Number,
    grade6: Number,
    grade7: Number,
    grade8: Number,
    grade9: Number
});

const termSettingsSchema = new mongoose.Schema({
    currentTerm: { type: String, required: true },
    currentYear: { type: Number, required: true }
});

const learnerArchiveSchema = new mongoose.Schema({
    year: { type: Number, required: true },
    learners: [learnerSchema]
});

// Add indexes
learnerSchema.index({ admissionNo: 1 });
feeSchema.index({ admissionNo: 1 });
bookSchema.index({ admissionNo: 1 });
classBookSchema.index({ bookNumber: 1 });
learnerArchiveSchema.index({ year: 1 });

export const Learner = mongoose.model('Learner', learnerSchema);
export const Fee = mongoose.model('Fee', feeSchema);
export const Book = mongoose.model('Book', bookSchema);
export const ClassBook = mongoose.model('ClassBook', classBookSchema);
export const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);
export const TermSettings = mongoose.model('TermSettings', termSettingsSchema);
export const LearnerArchive = mongoose.model('LearnerArchive', learnerArchiveSchema);

// Middleware to check MongoDB connection
export const checkMongoDBConnection = (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Service Unavailable: MongoDB is not connected' });
    }
    return null;
};