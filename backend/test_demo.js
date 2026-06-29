import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import DemoRequest from './src/models/DemoRequest.js';
import { emailService } from './src/services/emailService.js';

async function testDemo() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  try {
    const responses = {
      name: 'kalpesh test',
      email: 'vertexakola@gmail.com',
      demo_date: '15/06',
      demo_time: '12 PM'
    };
    
    console.log('Saving DemoRequest...');
    const demoRequest = new DemoRequest({
      name: responses.name || 'WhatsApp User',
      email: responses.email || 'N/A',
      phone: '1234567890',
      message: `Requested via WhatsApp Chatbot for Date: ${responses.demo_date}, Time: ${responses.demo_time}`,
      status: 'pending',
      requestedAt: new Date(),
    });
    
    await demoRequest.save();
    console.log('✅ DemoRequest saved!', demoRequest._id);

    console.log('Sending emails...');
    await emailService.sendEmail(
      'support@replysys.com',
      `New Demo Request via WhatsApp: ${demoRequest.name}`,
      `<p>New Demo Request</p>`
    );
    
    await emailService.sendEmail(
      responses.email,
      'Demo Request Received - Replysys',
      `<p>Thank you for your interest!</p>`
    );
    
    console.log('Emails sent successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testDemo();
