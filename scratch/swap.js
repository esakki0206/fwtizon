const fs = require('fs');
const path = require('path');

const filePath = 'd:\\fwtion\\client\\src\\pages\\dashboard\\Dashboard.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

const marker1 = '        {/* Enrolled Courses Grid */}';
const marker2 = '        {/* Live Masterclasses Section */}';
const marker3 = '        {/* Feedback Modal */}';

const idx1 = content.indexOf(marker1);
const idx2 = content.indexOf(marker2);
const idx3 = content.indexOf(marker3);

if (idx1 !== -1 && idx2 !== -1 && idx3 !== -1) {
  const before = content.substring(0, idx1);
  const enrolledBlock = content.substring(idx1, idx2);
  const liveBlock = content.substring(idx2, idx3);
  const after = content.substring(idx3);

  // We need to adjust the formatting so it's clean.
  // just swap liveBlock and enrolledBlock
  const newContent = before + liveBlock + enrolledBlock + after;
  
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log('Successfully swapped the blocks.');
} else {
  console.log('Could not find markers.', { idx1, idx2, idx3 });
}
