import PDFDocument from 'pdfkit';

/**
 * Generates an A4 Portrait Payment Receipt
 * @param {Object} data Receipt data map
 * @returns {Promise<Buffer>} PDF Buffer
 */
export const generateReceiptPDF = (data) => {
  return new Promise((resolve, reject) => {
    const {
      receiptId,
      userName,
      userEmail,
      courseName,
      amount,
      paymentId,
      orderId,
      date,
      status
    } = data;

    // Create a document A4 portrait
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Dimensions
    const width = 595;

    // Colors
    const NAVY = '#1a1a2e';
    const GOLD = '#c9a84c';
    const GRAY = '#4B5563';
    const GREEN = '#10B981';
    const RED = '#EF4444';

    // 1. Header
    doc.font('Helvetica-Bold')
       .fontSize(28)
       .fillColor(NAVY)
       .text('FWT', 50, 50, { continued: true })
       .fillColor(GOLD)
       .text(' iZON');
    
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(GRAY)
       .text('FrontierWox Tech Platform', 50, 85);
       
    doc.moveTo(50, 110).lineTo(width - 50, 110).lineWidth(2).stroke(NAVY);

    // 2. Receipt Heading
    doc.font('Helvetica-Bold')
       .fontSize(20)
       .fillColor(NAVY)
       .text('PAYMENT RECEIPT', 0, 140, { align: 'center' });

    // 3. Receipt Info Box (Top Right)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Receipt No:', 380, 50);
    doc.font('Helvetica').fillColor(GRAY).text(receiptId, 450, 50);
    
    const formattedDate = new Date(date).toLocaleString('en-US', {
      dateStyle: 'medium', timeStyle: 'short'
    });
    doc.font('Helvetica-Bold').fillColor(NAVY).text('Date:', 380, 65);
    doc.font('Helvetica').fillColor(GRAY).text(formattedDate, 420, 65);

    // 4. Billing Details
    const startY = 200;
    const rowHeight = 35;

    doc.font('Helvetica-Bold').fontSize(14).fillColor(NAVY).text('Billed To:', 50, startY - 20);
    doc.font('Helvetica').fontSize(12).fillColor(GRAY);
    doc.text(userName, 50, startY);
    doc.text(userEmail, 50, startY + 15);

    // 5. Transaction Details Table
    const tableY = 280;
    
    // Table Header
    doc.rect(50, tableY, width - 100, 30).fill(NAVY);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF');
    doc.text('Description', 60, tableY + 10);
    doc.text('Details', 350, tableY + 10);

    // Table Rows
    const rows = [
      { label: 'Course Name', value: courseName },
      { label: 'Payment ID', value: paymentId },
      { label: 'Order ID', value: orderId },
      { label: 'Payment Status', value: status },
      { label: 'Total Amount', value: `INR ${amount.toLocaleString('en-IN')}` } // Using INR to avoid font encoding issues with Rupee symbol
    ];

    let currentY = tableY + 30;
    rows.forEach((row, i) => {
      // Background shading for alternate rows
      if (i % 2 === 0) {
        doc.rect(50, currentY, width - 100, rowHeight).fill('#F9FAFB');
      }

      doc.font('Helvetica').fontSize(11).fillColor(NAVY);
      doc.text(row.label, 60, currentY + 12);

      // Handle specific formatting for Status and Amount
      if (row.label === 'Payment Status') {
        const isSuccess = row.value === 'SUCCESS';
        doc.font('Helvetica-Bold').fillColor(isSuccess ? GREEN : RED);
        doc.text(row.value, 350, currentY + 12);
      } else if (row.label === 'Total Amount') {
        doc.font('Helvetica-Bold').fillColor(NAVY);
        doc.text(row.value, 350, currentY + 12);
      } else {
        doc.font('Helvetica').fillColor(GRAY);
        doc.text(row.value, 350, currentY + 12, { width: 190, ellipsis: true });
      }

      // Bottom border for the row
      doc.moveTo(50, currentY + rowHeight).lineTo(width - 50, currentY + rowHeight).lineWidth(0.5).stroke('#E5E7EB');

      currentY += rowHeight;
    });

    // 6. Footer
    const footerY = height - 100;
    doc.moveTo(50, footerY).lineTo(width - 50, footerY).lineWidth(2).stroke(GOLD);
    
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor(NAVY)
       .text('Thank you for your purchase!', 0, footerY + 20, { align: 'center' });
    
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(GRAY)
       .text('If you have any questions about this receipt, please contact', 0, footerY + 40, { align: 'center' })
       .text('support@fwtizon.com', 0, footerY + 55, { align: 'center' });

    // Finalize
    doc.end();
  });
};
