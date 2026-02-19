/**
 * Email Service - Nodemailer with Outlook SMTP
 * Sends ticket confirmation emails with PDF attachments
 */

const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      ciphers: 'SSLv3',
    },
  });
};

// Generate PDF for tickets
const generateTicketsPDF = async (tickets, event) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    doc.on('error', reject);

    // Header
    doc.fontSize(24).fillColor('#1a1a2e').text('🎟 Tazkara Tickets', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).fillColor('#333').text(event.name, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#666').text(`Order Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Line
    doc.strokeColor('#ddd').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(2);

    // Each ticket
    tickets.forEach((ticket, index) => {
      doc.fontSize(14).fillColor('#1a1a2e').text(`Ticket #${index + 1}`);
      doc.moveDown(0.5);

      doc.fontSize(11).fillColor('#444');
      doc.text(`Ticket ID: ${ticket._id}`);
      doc.text(`Holder: ${ticket.holderName}`);
      doc.text(`Seat Type: ${ticket.categoryType}`);
      doc.text(`Wave: ${ticket.waveName}`);
      doc.text(`Status: ${ticket.status}`);
      doc.moveDown(1.5);
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).fillColor('#888').text('Thank you for your purchase!', { align: 'center' });
    doc.text('Please present this PDF or QR code at the venue.', { align: 'center' });

    doc.end();
  });
};

// Generate QR code as data URL
const generateQRDataURL = async (ticketId) => {
  try {
    const validationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/validate/${ticketId}`;
    return await QRCode.toDataURL(validationUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch (err) {
    console.error('[email] QR generation error:', err);
    return null;
  }
};

// Send ticket confirmation email
const sendTicketEmail = async (userEmail, userName, order, event, tickets) => {
  try {
    const transporter = createTransporter();

    // Generate QR codes for each ticket
    const ticketsWithQR = await Promise.all(
      tickets.map(async (ticket) => ({
        ...ticket,
        qrDataURL: await generateQRDataURL(ticket._id),
      }))
    );

    // Generate PDF
    const pdfBuffer = await generateTicketsPDF(tickets, event);

    // Build HTML email
    const ticketRows = tickets
      .map(
        (t, i) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${i + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${t.holderName}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${t.categoryType}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${t.waveName}</td>
        </tr>
      `
      )
      .join('');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #1a1a2e; text-align: center; margin-bottom: 5px;">🎟️ Tazkara</h1>
          <h2 style="color: #333; text-align: center; margin-top: 0;">Your Tickets Confirmed!</h2>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1a1a2e;">${event.name}</h3>
            <p style="margin: 5px 0; color: #666;">📅 ${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p style="margin: 5px 0; color: #666;">📍 ${event.venue}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #1a1a2e; color: white;">
                <th style="padding: 10px; text-align: left;">#</th>
                <th style="padding: 10px; text-align: left;">Holder</th>
                <th style="padding: 10px; text-align: left;">Seat</th>
                <th style="padding: 10px; text-align: left;">Wave</th>
              </tr>
            </thead>
            <tbody>
              ${ticketRows}
            </tbody>
          </table>

          <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>Order ID:</strong> ${order._id}<br>
              <strong>Total Paid:</strong> $${order.totalAmount}
            </p>
          </div>

          <p style="color: #888; font-size: 12px; text-align: center; margin-top: 30px;">
            Please present the attached PDF or your ticket QR codes at the venue entrance.<br>
            Thank you for choosing Tazkara! 🎉
          </p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Tazkara Tickets" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `🎟️ Your Tickets for ${event.name}`,
      html: htmlBody,
      attachments: [
        {
          filename: `Tazkara_Tickets_${order._id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[email] Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[email] Failed to send email:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { sendTicketEmail };
