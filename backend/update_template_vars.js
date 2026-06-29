import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const Template = (await import('./src/models/Template.js')).default;
    
    console.log('Updating templates with correct variables arrays and mappings...');

    // 1. replysys_login_otp
    await Template.updateOne(
      { projectId: 'proj_1776957139168', name: 'replysys_login_otp' },
      { 
        $set: { 
          variables: ['1'],
          variableMappings: {
            '1': { variableNumber: '1', fieldName: 'otp', fieldLabel: 'OTP Code' }
          }
        } 
      }
    );

    // 2. replysys_payment_reminder
    await Template.updateOne(
      { projectId: 'proj_1776957139168', name: 'replysys_payment_reminder' },
      { 
        $set: { 
          variables: ['1', '2', '3', '4'],
          variableMappings: {
            '1': { variableNumber: '1', fieldName: 'name', fieldLabel: 'Customer Name' },
            '2': { variableNumber: '2', fieldName: 'plan', fieldLabel: 'Plan Name' },
            '3': { variableNumber: '3', fieldName: 'dueDate', fieldLabel: 'Due Date' },
            '4': { variableNumber: '4', fieldName: 'amount', fieldLabel: 'Amount Due' }
          }
        } 
      }
    );

    // 3. replysys_low_credit
    await Template.updateOne(
      { projectId: 'proj_1776957139168', name: 'replysys_low_credit' },
      { 
        $set: { 
          variables: ['1', '2'],
          variableMappings: {
            '1': { variableNumber: '1', fieldName: 'name', fieldLabel: 'Customer Name' },
            '2': { variableNumber: '2', fieldName: 'credits', fieldLabel: 'Credits Remaining' }
          }
        } 
      }
    );

    // 4. replysys_renewal_reminder
    await Template.updateOne(
      { projectId: 'proj_1776957139168', name: 'replysys_renewal_reminder' },
      { 
        $set: { 
          variables: ['1', '2', '3'],
          variableMappings: {
            '1': { variableNumber: '1', fieldName: 'name', fieldLabel: 'Customer Name' },
            '2': { variableNumber: '2', fieldName: 'plan', fieldLabel: 'Plan Name' },
            '3': { variableNumber: '3', fieldName: 'renewalDate', fieldLabel: 'Renewal Date' }
          }
        } 
      }
    );

    // 5. replysys_welcome
    await Template.updateOne(
      { projectId: 'proj_1776957139168', name: 'replysys_welcome' },
      { 
        $set: { 
          variables: ['1', '2'],
          variableMappings: {
            '1': { variableNumber: '1', fieldName: 'name', fieldLabel: 'Customer Name' },
            '2': { variableNumber: '2', fieldName: 'plan', fieldLabel: 'Plan Name' }
          }
        } 
      }
    );

    console.log('Successfully updated all template variables and mappings to prevent Meta rejection!');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });
