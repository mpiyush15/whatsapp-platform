import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const Template = (await import('./src/models/Template.js')).default;
    
    // 1. Delete all non-approved 'rs_' templates for the internal project
    const deleteResult = await Template.deleteMany({
      projectId: 'proj_1776957139168',
      name: { $regex: '^rs_' },
      status: { $ne: 'approved' }
    });
    console.log(`Deleted ${deleteResult.deletedCount} draft/error templates starting with 'rs_'`);

    // 2. Seed the new correct templates for SaaS System Outbound Usage
    const templatesToSeed = [
      {
        accountId: 'acct_system_123',
        projectId: 'proj_1776957139168',
        name: 'rs_login_otp_v1',
        language: 'en',
        category: 'authentication',
        status: 'draft',
        content: 'Your Replysys verification code is {{1}}. Please do not share this code with anyone.',
        footerText: 'Replysys Security',
        components: [
          {
            type: 'BODY',
            text: 'Your Replysys verification code is {{1}}. Please do not share this code with anyone.',
            example: { body_text: [['123456']] }
          },
          {
            type: 'FOOTER',
            text: 'Replysys Security'
          },
          {
            type: 'BUTTONS',
            buttons: [
              { type: 'OTP', text: 'Copy Code', otp_type: 'COPY_CODE' }
            ]
          }
        ]
      },
      {
        accountId: 'acct_system_123',
        projectId: 'proj_1776957139168',
        name: 'rs_payment_reminder_v1',
        language: 'en',
        category: 'utility',
        status: 'draft',
        headerText: 'Payment Reminder',
        footerText: 'Replysys Billing Team',
        content: 'Hi {{1}},\n\nThis is a friendly reminder that your upcoming invoice for the {{2}} plan is due on {{3}}.\n\nAmount due: {{4}}\n\nPlease ensure your payment method is up to date to avoid service interruption.',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Payment Reminder'
          },
          {
            type: 'BODY',
            text: 'Hi {{1}},\n\nThis is a friendly reminder that your upcoming invoice for the {{2}} plan is due on {{3}}.\n\nAmount due: {{4}}\n\nPlease ensure your payment method is up to date to avoid service interruption.',
            example: { body_text: [['John', 'Pro', '15th Nov', '₹1999']] }
          },
          {
            type: 'FOOTER',
            text: 'Replysys Billing Team'
          }
        ]
      },
      {
        accountId: 'acct_system_123',
        projectId: 'proj_1776957139168',
        name: 'rs_low_credit_v1',
        language: 'en',
        category: 'utility',
        status: 'draft',
        headerText: 'Low Credits Alert',
        footerText: 'Replysys Platform',
        content: 'Hi {{1}},\n\nYour WhatsApp messaging credits are running low. You currently have {{2}} credits remaining.\n\nTo ensure your campaigns and automations continue running smoothly, please top up your account.',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Low Credits Alert'
          },
          {
            type: 'BODY',
            text: 'Hi {{1}},\n\nYour WhatsApp messaging credits are running low. You currently have {{2}} credits remaining.\n\nTo ensure your campaigns and automations continue running smoothly, please top up your account.',
            example: { body_text: [['John', '150']] }
          },
          {
            type: 'FOOTER',
            text: 'Replysys Platform'
          }
        ]
      },
      {
        accountId: 'acct_system_123',
        projectId: 'proj_1776957139168',
        name: 'rs_renewal_reminder_v1',
        language: 'en',
        category: 'utility',
        status: 'draft',
        headerText: 'Subscription Renewal',
        footerText: 'Replysys Billing Team',
        content: 'Hi {{1}},\n\nYour Replysys {{2}} subscription is scheduled to renew automatically on {{3}}.\n\nThank you for being a valued customer!',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Subscription Renewal'
          },
          {
            type: 'BODY',
            text: 'Hi {{1}},\n\nYour Replysys {{2}} subscription is scheduled to renew automatically on {{3}}.\n\nThank you for being a valued customer!',
            example: { body_text: [['John', 'Pro', '15th Nov']] }
          },
          {
            type: 'FOOTER',
            text: 'Replysys Billing Team'
          }
        ]
      }
    ];

    // Get the account ID from an existing approved template to match tenant logic
    const existingTemplate = await Template.findOne({ projectId: 'proj_1776957139168' });
    if (existingTemplate) {
        templatesToSeed.forEach(t => t.accountId = existingTemplate.accountId);
    }

    const seeded = await Template.insertMany(templatesToSeed);
    console.log(`Seeded ${seeded.length} clean templates for SaaS usage.`);
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });
