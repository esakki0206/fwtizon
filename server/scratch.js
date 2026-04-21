import fs from 'fs';
import { generateCertificatePDF } from './utils/generateCertificatePDF.js';

async function test() {
  const data = {
    studentName: 'John Doe',
    courseName: 'Test Course',
    domain: 'Software',
    areaOfExpertise: 'Testing',
    completionDate: new Date(),
    certificateId: 'FWT-1234',
    serialNumber: 1234,
    type: 'COHORT'
  };
  
  try {
    const buffer = await generateCertificatePDF(data);
    fs.writeFileSync('test_output.pdf', buffer);
    console.log('Successfully wrote test_output.pdf! Size:', buffer.length);
  } catch (err) {
    console.error('Error generating:', err);
  }
}
test();
