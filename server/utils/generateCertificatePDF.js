import PDFDocument from 'pdfkit';

/**
 * Generates an A4 Landscape Certificate of Completion
 * @param {Object} data Certificate data map
 * @returns {Promise<Buffer>} PDF Buffer
 */
export const generateCertificatePDF = (data) => {
  return new Promise((resolve, reject) => {
    const {
      studentName,
      courseName,
      domain = 'Development',
      areaOfExpertise = 'Specialized Training',
      completionDate,
      certificateId,
      serialNumber
    } = data;

    // Create a document A4 landscape
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Dimensions for A4 landscape
    const width = 842;
    const height = 595;

    // Colors
    const NAVY = '#1a1a2e';
    const GOLD = '#c9a84c';
    const GRAY = '#4B5563';

    // 1. Draw outer border
    doc.rect(20, 20, width - 40, height - 40).lineWidth(12).stroke(NAVY);
    // Inner thin border
    doc.rect(38, 38, width - 76, height - 76).lineWidth(1).stroke(GOLD);

    // 2. Header Branding
    doc.font('Helvetica-Bold')
       .fontSize(32)
       .fillColor(NAVY)
       .text('FWT', 60, 60, { continued: true })
       .fillColor(GOLD)
       .text(' iZON');
    
    // Decorative Gold Line
    doc.moveTo(180, 75).lineTo(width - 60, 75).lineWidth(2).stroke(GOLD);

    // 3. Title
    doc.font('Times-Bold')
       .fontSize(36)
       .fillColor(NAVY)
       .text('CERTIFICATE OF COMPLETION', 0, 140, { align: 'center' });
    
    // 4. Body Content
    doc.font('Helvetica')
       .fontSize(14)
       .fillColor(GRAY)
       .text('This certificate is proudly presented to', 0, 200, { align: 'center' });
    
    // Student Name
    doc.font('Times-BoldItalic')
       .fontSize(42)
       .fillColor(NAVY)
       .text(studentName.toUpperCase(), 0, 240, { align: 'center' });

    // Underline Student Name
    const nameWidth = doc.widthOfString(studentName.toUpperCase());
    const startX = (width - nameWidth) / 2;
    doc.moveTo(startX, 290).lineTo(startX + nameWidth, 290).lineWidth(1).stroke(GRAY);

    const completionText = data.type === 'COHORT' 
      ? `for successfully completing the live cohort program in`
      : `for successfully completing the training program in`;

    doc.font('Helvetica')
       .fontSize(14)
       .fillColor(GRAY)
       .text(completionText, 0, 310, { align: 'center' });

    // Course Name
    doc.font('Helvetica-Bold')
       .fontSize(22)
       .fillColor(NAVY)
       .text(courseName, 0, 340, { align: 'center' });
    
    // Domain & Expertise
    doc.font('Helvetica')
       .fontSize(12)
       .fillColor(GRAY)
       .text(`Domain: ${domain} | Area of Expertise: ${areaOfExpertise}`, 0, 375, { align: 'center' });

    // 5. Signatures
    const sigY = 460;
    
    // Left Signature - Ajay James
    doc.moveTo(100, sigY + 20).lineTo(300, sigY + 20).lineWidth(1).stroke(NAVY);
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor(NAVY)
       .text('Ajay James', 100, sigY + 25, { width: 200, align: 'center' });
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(GRAY)
       .text('DIRECTOR', 100, sigY + 45, { width: 200, align: 'center' });

    // Center Gold Seal (Text representation)
    doc.circle(width / 2, sigY + 15, 35).lineWidth(2).stroke(GOLD);
    doc.font('Times-Bold')
       .fontSize(12)
       .fillColor(GOLD)
       .text('VERIFIED', width / 2 - 35, sigY + 5, { width: 70, align: 'center' })
       .text('FWT', width / 2 - 35, sigY + 18, { width: 70, align: 'center' });

    // Right Signature - Aadhi N
    doc.moveTo(width - 300, sigY + 20).lineTo(width - 100, sigY + 20).lineWidth(1).stroke(NAVY);
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor(NAVY)
       .text('Aadhi N', width - 300, sigY + 25, { width: 200, align: 'center' });
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(GRAY)
       .text('CEO', width - 300, sigY + 45, { width: 200, align: 'center' });

    // 6. Footer (Date and Cert ID)
    const formattedDate = new Date(completionDate).toLocaleDateString('en-GB', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    });
    
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(GRAY)
       .text(`Date: ${formattedDate}`, 60, height - 60);
    
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(GRAY)
       .text(`Sl No: ${certificateId}`, width - 250, height - 60, { width: 190, align: 'right' });

    // Finalize
    doc.end();
  });
};
