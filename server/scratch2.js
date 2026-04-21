import fs from 'fs';
import { generateCertificatePDF } from './utils/generateCertificatePDF.js';
import { uploadPdfToCloudinary } from './utils/uploadPdfToCloudinary.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const data = {
    studentName: 'John Test',
    courseName: 'Cloudinary Test',
    domain: 'Software',
    areaOfExpertise: 'Testing',
    completionDate: new Date(),
    certificateId: 'FWT-TEST',
    serialNumber: 9999,
    type: 'COHORT'
  };
  
  try {
    const buffer = await generateCertificatePDF(data);
    const url = await uploadPdfToCloudinary(buffer, 'fwt-test-cert', 'fwtion/certificates');
    console.log('Successfully uploaded! URL:', url);
  } catch (err) {
    console.error('Error generating:', err);
  }
}
test();
