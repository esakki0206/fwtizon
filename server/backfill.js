import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Mongoose Models
import Certificate from './models/Certificate.js';
import FeedbackSubmission from './models/FeedbackSubmission.js';
import FeedbackForm from './models/FeedbackForm.js';
import Enrollment from './models/Enrollment.js';
import LiveCourse from './models/LiveCourse.js';
import Course from './models/Course.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fwtion');
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('Database connection failed', err);
    process.exit(1);
  }
};

const runBackfill = async () => {
  await connectDB();

  try {
    // 1. Backfill Certificates
    console.log('Backfilling Certificates...');
    const certResult = await Certificate.updateMany(
      { certificateType: { $exists: false } },
      { $set: { certificateType: 'Completion Certificate' } }
    );
    console.log(`Updated ${certResult.modifiedCount} certificates.`);

    // 2. Backfill Feedback Submissions
    console.log('Backfilling Feedback Submissions...');
    const subResult = await FeedbackSubmission.updateMany(
      { selectedCertificateType: { $exists: false } },
      { $set: { selectedCertificateType: 'Completion Certificate' } }
    );
    console.log(`Updated ${subResult.modifiedCount} feedback submissions.`);

    // 3. Backfill Feedback Forms
    console.log('Backfilling Feedback Forms...');
    const formResult = await FeedbackForm.updateMany(
      { availableCertificateTypes: { $exists: false } },
      { $set: { availableCertificateTypes: ['Completion Certificate'] } }
    );
    console.log(`Updated ${formResult.modifiedCount} feedback forms.`);

    // 4. Sync Enrollment Counts
    console.log('Syncing Enrollment Counts...');
    const liveCourses = await LiveCourse.find().select('_id currentEnrollments');
    let liveFixed = 0;
    for (const lc of liveCourses) {
      const actualCount = await Enrollment.countDocuments({
        liveCourse: lc._id,
        status: { $in: ['active', 'completed'] }
      });
      if (lc.currentEnrollments !== actualCount) {
        lc.currentEnrollments = actualCount;
        await lc.save({ validateBeforeSave: false });
        liveFixed++;
      }
    }
    
    const courses = await Course.find().select('_id enrollmentCount');
    let courseFixed = 0;
    for (const c of courses) {
      const actualCount = await Enrollment.countDocuments({
        course: c._id,
        status: { $in: ['active', 'completed'] }
      });
      if (c.enrollmentCount !== actualCount) {
        c.enrollmentCount = actualCount;
        await c.save({ validateBeforeSave: false });
        courseFixed++;
      }
    }
    console.log(`Enrollment counts synced. Fixed ${liveFixed} live courses and ${courseFixed} normal courses.`);

    console.log('Backfill completed successfully.');
  } catch (error) {
    console.error('Error running backfill:', error);
  } finally {
    mongoose.connection.close();
  }
};

runBackfill();
