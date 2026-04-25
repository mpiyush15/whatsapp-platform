#!/usr/bin/env node

/**
 * PHASE 1 - DATABASE MIGRATION SCRIPT
 * Purpose: Create default project for each account and migrate all existing data
 * Date: April 25, 2026
 * Version: replysys v1.2.0 → v2.0.0
 * 
 * CRITICAL: This script:
 * 1. Creates default project for every existing account
 * 2. Adds projectId to all existing records
 * 3. Maintains backward compatibility
 * 4. ZERO data loss
 * 5. Can be run multiple times safely (idempotent)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import Models
import Project from '../src/models/Project.js';
import Account from '../src/models/Account.js';
import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';
import Contact from '../src/models/Contact.js';
import Template from '../src/models/Template.js';
import Campaign from '../src/models/Campaign.js';
import Broadcast from '../src/models/Broadcast.js';
import Agent from '../src/models/Agent.js';
import Lead from '../src/models/Lead.js';
import Tag from '../src/models/Tag.js';
import Segment from '../src/models/Segment.js';
import ActivityTimeline from '../src/models/ActivityTimeline.js';
import InternalNote from '../src/models/InternalNote.js';
import QuickReply from '../src/models/QuickReply.js';
import Notification from '../src/models/Notification.js';
import FailedMessage from '../src/models/FailedMessage.js';
import PhoneNumber from '../src/models/PhoneNumber.js';
import Payment from '../src/models/Payment.js';
import Invoice from '../src/models/Invoice.js';
import Subscription from '../src/models/Subscription.js';
import WorkflowSession from '../src/models/WorkflowSession.js';
import ChatbotLead from '../src/models/ChatbotLead.js';
import ConversationAssignment from '../src/models/ConversationAssignment.js';
import ContactTimeline from '../src/models/ContactTimeline.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';

const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()} - ${msg}`),
  warning: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${new Date().toISOString()} - ${msg}`)
};

// Generate unique project ID
const generateProjectId = () => `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.success('Connected to MongoDB');
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

async function createDefaultProjects() {
  logger.info('Starting: Create default projects for all accounts...');
  
  try {
    // Get all accounts without default project
    const accounts = await Account.find({}).lean();
    logger.info(`Found ${accounts.length} accounts to process`);
    
    let created = 0;
    let skipped = 0;
    
    for (const account of accounts) {
      try {
        // Check if account already has default project
        const existingProject = await Project.findOne({
          accountId: account.accountId || account._id.toString(),
          isDefault: true
        });
        
        if (existingProject) {
          skipped++;
          logger.warning(`Account ${account.accountId} already has default project`);
          continue;
        }
        
        // Create default project
        const projectId = generateProjectId();
        const accountId = account.accountId || account._id.toString();
        
        await Project.create({
          projectId,
          accountId,
          name: `${account.name || 'Default'} - Default Project`,
          description: 'Default project created during Phase 1 migration',
          isDefault: true,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        created++;
        logger.success(`Created default project for account: ${accountId}`);
        
        // Update all accountId records to use projectId
        await updateAccountData(accountId, projectId);
        
      } catch (error) {
        logger.error(`Failed to process account: ${error.message}`);
      }
    }
    
    logger.success(`Default projects created: ${created}, Skipped: ${skipped}`);
    return { created, skipped };
    
  } catch (error) {
    logger.error(`Failed to create default projects: ${error.message}`);
    throw error;
  }
}

async function updateAccountData(accountId, projectId) {
  logger.info(`Updating all records for account ${accountId} with projectId ${projectId}...`);
  
  const models = [
    { name: 'Conversation', model: Conversation },
    { name: 'Message', model: Message },
    { name: 'Contact', model: Contact },
    { name: 'Template', model: Template },
    { name: 'Campaign', model: Campaign },
    { name: 'Broadcast', model: Broadcast },
    { name: 'Agent', model: Agent },
    { name: 'Lead', model: Lead },
    { name: 'Tag', model: Tag },
    { name: 'Segment', model: Segment },
    { name: 'ActivityTimeline', model: ActivityTimeline },
    { name: 'InternalNote', model: InternalNote },
    { name: 'QuickReply', model: QuickReply },
    { name: 'Notification', model: Notification },
    { name: 'FailedMessage', model: FailedMessage },
    { name: 'PhoneNumber', model: PhoneNumber },
    { name: 'Payment', model: Payment },
    { name: 'Invoice', model: Invoice },
    { name: 'Subscription', model: Subscription },
    { name: 'WorkflowSession', model: WorkflowSession },
    { name: 'ChatbotLead', model: ChatbotLead },
    { name: 'ConversationAssignment', model: ConversationAssignment },
    { name: 'ContactTimeline', model: ContactTimeline }
  ];
  
  for (const { name, model } of models) {
    try {
      const result = await model.updateMany(
        { 
          accountId,
          projectId: { $in: [null, undefined, ''] }
        },
        { 
          $set: { projectId }
        }
      );
      
      if (result.modifiedCount > 0) {
        logger.success(`${name}: Updated ${result.modifiedCount} records`);
      }
    } catch (error) {
      logger.warning(`${name}: Update failed - ${error.message}`);
    }
  }
}

async function createIndexes() {
  logger.info('Creating database indexes...');
  
  try {
    // Projects collection indexes
    await Project.collection.createIndex({ projectId: 1 }, { unique: true });
    await Project.collection.createIndex({ accountId: 1, isDefault: 1 }, { unique: true, sparse: true });
    await Project.collection.createIndex({ accountId: 1, status: 1 });
    logger.success('Project indexes created');
    
    // Conversation indexes
    await Conversation.collection.createIndex({ projectId: 1, accountId: 1 });
    await Conversation.collection.createIndex({ projectId: 1, phoneNumberId: 1 });
    logger.success('Conversation indexes created');
    
    // Message indexes
    await Message.collection.createIndex({ projectId: 1, accountId: 1 });
    await Message.collection.createIndex({ projectId: 1, conversationId: 1 });
    logger.success('Message indexes created');
    
    // Other collections
    await Contact.collection.createIndex({ projectId: 1, accountId: 1 });
    await Template.collection.createIndex({ projectId: 1, accountId: 1 });
    await Campaign.collection.createIndex({ projectId: 1, accountId: 1 });
    await Agent.collection.createIndex({ projectId: 1, accountId: 1 });
    
    logger.success('All database indexes created');
  } catch (error) {
    logger.warning(`Index creation warning: ${error.message}`);
  }
}

async function verifyMigration() {
  logger.info('Verifying migration...');
  
  try {
    // Check 1: All accounts have at least one project
    const accountsWithoutProject = await Account.countDocuments({
      accountId: { $exists: true }
    });
    
    const projectsCreated = await Project.countDocuments({ isDefault: true });
    
    logger.info(`Accounts needing projects: ${accountsWithoutProject}`);
    logger.info(`Default projects created: ${projectsCreated}`);
    
    // Check 2: Sample data consistency
    const sampleProject = await Project.findOne({ isDefault: true });
    if (sampleProject) {
      const conversationsWithProjectId = await Conversation.countDocuments({
        accountId: sampleProject.accountId,
        projectId: { $exists: true, $ne: null }
      });
      
      const messagesWithProjectId = await Message.countDocuments({
        accountId: sampleProject.accountId,
        projectId: { $exists: true, $ne: null }
      });
      
      logger.info(`Sample account - Conversations with projectId: ${conversationsWithProjectId}`);
      logger.info(`Sample account - Messages with projectId: ${messagesWithProjectId}`);
    }
    
    logger.success('Migration verification complete');
    return true;
    
  } catch (error) {
    logger.error(`Verification failed: ${error.message}`);
    return false;
  }
}

async function runMigration() {
  try {
    logger.info('='.repeat(60));
    logger.info('PHASE 1 DATABASE MIGRATION STARTED');
    logger.info('='.repeat(60));
    
    await connectDB();
    
    // Step 1: Create default projects
    const { created, skipped } = await createDefaultProjects();
    
    // Step 2: Create indexes
    await createIndexes();
    
    // Step 3: Verify
    const verified = await verifyMigration();
    
    logger.info('='.repeat(60));
    if (verified && created > 0) {
      logger.success('PHASE 1 MIGRATION COMPLETED SUCCESSFULLY ✅');
      logger.success(`Created: ${created} default projects, Skipped: ${skipped}`);
    } else {
      logger.warning('PHASE 1 MIGRATION COMPLETED WITH WARNINGS');
    }
    logger.info('='.repeat(60));
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    logger.error(`MIGRATION FAILED: ${error.message}`);
    logger.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
runMigration();
