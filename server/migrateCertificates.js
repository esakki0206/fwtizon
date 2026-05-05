/**
 * Migration: backfill existing certificates with templateId = null, templateName = 'Legacy Template'
 * Run: node migrateCertificates.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Certificate from './models/Certificate.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  const result = await Certificate.updateMany(
    { templateId: { $exists: false } },
    { $set: { templateId: null, templateName: 'Legacy Template' } }
  );

  console.log(`✓ Backfilled ${result.modifiedCount} certificates`);
  await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
