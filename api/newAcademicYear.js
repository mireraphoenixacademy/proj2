// api/newAcademicYear.js
import { TermSettings, Learner, LearnerArchive, checkMongoDBConnection } from './utils';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const connectionError = checkMongoDBConnection(req, res);
    if (connectionError) return;

    try {
        console.log('Starting new academic year...');
        const termSettings = await TermSettings.findOne();
        if (!termSettings) {
            console.log('Term settings not found');
            return res.status(400).json({ error: 'Term settings not found' });
        }

        const currentYear = termSettings.currentYear;
        const learners = await Learner.find();

        console.log(`Archiving learners for year ${currentYear}...`);
        const archive = new LearnerArchive({
            year: currentYear,
            learners: learners
        });
        await archive.save();
        console.log('Learners archived successfully');

        const gradeOrder = ['Playgroup', 'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
        for (let learner of learners) {
            const currentGradeIndex = gradeOrder.indexOf(learner.grade);
            if (currentGradeIndex < gradeOrder.length - 1) {
                learner.grade = gradeOrder[currentGradeIndex + 1];
                console.log(`Updating grade for learner ${learner.admissionNo} to ${learner.grade}`);
                await learner.save();
            } else {
                console.log(`Removing learner ${learner.admissionNo} (completed Grade 9)`);
                await Learner.findByIdAndDelete(learner._id);
            }
        }

        termSettings.currentYear = currentYear + 1;
        termSettings.currentTerm = 'Term 1';
        console.log('Updating term settings to:', termSettings);
        await termSettings.save();

        console.log('New academic year started successfully');
        res.status(200).end();
    } catch (error) {
        console.error('Error starting new academic year:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to start new academic year' });
    }
}