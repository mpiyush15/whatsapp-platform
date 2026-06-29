import contactRepository from '../repositories/contactRepository.js';
import contactTimelineService from './contactTimelineService.js';
import { ContactType } from '../constants/enums.js';
import Lead from '../models/Lead.js';
import { normalizePhone } from '../utils/normalizePhone.js';

const LEAD_INTENTS = new Set([
  'inquiry',
  'demo_request',
  'pricing_inquiry',
  'product_info',
  'complaint',
  'support_request',
  'purchase_intent',
  'comparison',
  'integration',
  'customization',
  'other'
]);

const LEAD_STATUSES = new Set(['new', 'contacted', 'qualified', 'negotiating', 'converted', 'lost', 'stale']);

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', 'y', '1', 'lead'].includes(String(value || '').trim().toLowerCase());
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean);
  return String(tags || '')
    .split(/[;,|]/)
    .map(tag => tag.trim())
    .filter(Boolean);
}

function normalizeContactType(value, isLead) {
  const type = String(value || '').trim().toLowerCase();
  if (isLead || type === ContactType.LEAD) return ContactType.LEAD;
  if (type === ContactType.OTHER) return ContactType.OTHER;
  return ContactType.CUSTOMER;
}

function normalizeIntent(value) {
  const intent = String(value || '').trim().toLowerCase();
  return LEAD_INTENTS.has(intent) ? intent : 'inquiry';
}

function normalizeLeadStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return LEAD_STATUSES.has(status) ? status : 'new';
}

class ContactService {
  async createContact(accountId, payload = {}) {
    const {
      name,
      phone,
      whatsappNumber,
      email,
      tags = [],
      source = 'Manual',
      type,
      company,
      intent,
      notes,
      area,
      courseInterest,
      customAttributes = {},
      metadata = {},
      projectId
    } = payload;

    const normalizedPhone = normalizePhone(phone || whatsappNumber);

    if (!normalizedPhone) {
      const error = new Error('Phone or WhatsApp number required');
      error.statusCode = 400;
      throw error;
    }

    const contactType = normalizeContactType(type, parseBoolean(payload.isLead));
    const contactData = {
      accountId,
      projectId: projectId || payload.projectId || null,
      name: name || normalizedPhone,
      phone: normalizedPhone,
      whatsappNumber: normalizedPhone,
      email,
      source,
      type: contactType,
      isOptedIn: true,
      optInDate: new Date(),
      firstContactAt: new Date(),
      tags: parseTags(tags),
      notes,
      metadata: {
        ...(metadata && typeof metadata === 'object' ? metadata : {}),
        rawContact: true,
        rawContactSource: 'manual'
      },
      customAttributes: {
        ...(customAttributes && typeof customAttributes === 'object' ? customAttributes : {}),
        ...(area ? { area: String(area).trim() } : {}),
        ...(courseInterest ? { courseInterest: String(courseInterest).trim() } : {})
      },
      messageCount: 0,
      conversationCount: 0
    };

    const upsertResult = await contactRepository.upsertByPhone(accountId, normalizedPhone, contactData);
    const contact = upsertResult?.value || upsertResult;

    if (!contact) {
      const error = new Error('Failed to save contact');
      error.statusCode = 500;
      throw error;
    }

    if (contactType === ContactType.LEAD) {
      await this.syncLeadFromContact(accountId, contact, { company, intent, source, projectId });
    }

    return contact;
  }

  async syncLeadFromContact(accountId, contact, payload = {}) {
    const phone = normalizePhone(contact?.phone || contact?.whatsappNumber || payload.phone);
    if (!phone || !contact?._id) return null;

    return Lead.findOneAndUpdate(
      { accountId, phone },
      {
        $set: {
          accountId,
          projectId: payload.projectId || contact.projectId || null,
          contactId: contact._id,
          phoneNumberId: payload.phoneNumberId || 'manual',
          name: contact.name || phone,
          email: contact.email || payload.email || '',
          phone,
          company: payload.company || contact.metadata?.company || '',
          intent: normalizeIntent(payload.intent),
          status: normalizeLeadStatus(payload.status),
          sourceMessage: payload.source || 'Contact import',
          updatedAt: new Date()
        },
        $setOnInsert: {
          conversationId: `contact_import_${accountId}_${phone.replace(/\D/g, '') || Date.now()}`,
          score: 50,
          messageCount: 1,
          firstMessage: new Date(),
          lastMessage: new Date(),
          tags: contact.tags || [],
          createdAt: new Date()
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  async importContacts(accountId, contacts = [], options = {}) {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      const error = new Error('Contacts array required');
      error.statusCode = 400;
      throw error;
    }

    const result = {
      imported: 0,
      created: 0,
      updated: 0,
      leadsSynced: 0,
      skipped: 0,
      errors: []
    };

    for (const [index, row] of contacts.entries()) {
      try {
        const phone = normalizePhone(row.phone || row.whatsappNumber || row.mobile || row.number);
        if (!phone) {
          result.skipped += 1;
          result.errors.push({ row: index + 1, error: 'Phone or WhatsApp number required' });
          continue;
        }

        const isLead = parseBoolean(row.isLead) || String(row.type || '').trim().toLowerCase() === ContactType.LEAD;
        const type = normalizeContactType(row.type, isLead);
        const tags = parseTags(row.tags);

        const upsertResult = await contactRepository.upsertByPhone(accountId, phone, {
          projectId: options.projectId || row.projectId || null,
          name: row.name || row.fullName || phone,
          phone,
          whatsappNumber: phone,
          email: row.email || '',
          source: row.source || 'CSV Import',
          type,
          isOptedIn: row.isOptedIn === undefined ? true : parseBoolean(row.isOptedIn),
          optInDate: row.isOptedIn === false ? undefined : new Date(),
          tags,
          notes: row.notes || '',
          customAttributes: {
            area: row.area || row.location || row.city || '',
            courseInterest: row.courseInterest || row.course || row.interestedCourse || ''
          },
          metadata: {
            company: row.company || row.businessName || '',
            importBatch: options.importBatch || '',
            originalType: row.type || '',
            rawContact: true,
            rawContactSource: 'import'
          }
        });

        const contact = upsertResult.value;
        result.imported += 1;
        if (upsertResult.lastErrorObject?.updatedExisting) {
          result.updated += 1;
        } else {
          result.created += 1;
        }

        if (type === ContactType.LEAD) {
          await this.syncLeadFromContact(accountId, contact, {
            company: row.company || row.businessName,
            intent: row.intent,
            status: row.leadStatus || row.status || 'new',
            source: row.source || 'CSV Import',
            projectId: options.projectId || row.projectId || null
          });
          result.leadsSynced += 1;
        }
      } catch (error) {
        result.skipped += 1;
        result.errors.push({ row: index + 1, error: error.message });
      }
    }

    return result;
  }

  async getContacts(accountId, filters = {}) {
    return contactRepository.findByAccountId(accountId, filters);
  }

  async getContact(accountId, contactId, projectId = null) {
    return contactRepository.findByIdAndAccount(contactId, accountId, projectId);
  }

  async getContactByPhone(accountId, whatsappNumber) {
    if (!whatsappNumber) {
      const error = new Error('Phone number required');
      error.statusCode = 400;
      throw error;
    }

    return contactRepository.findByPhone(accountId, whatsappNumber);
  }

  async updateContact(accountId, contactId, updates = {}, projectId = null) {
    const allowedUpdates = [
      'name',
      'phone',
      'whatsappNumber',
      'email',
      'tags',
      'notes',
      'type',
      'isOptedIn',
      'source',
      'customAttributes',
      'leadStatus',
      'leadValue'
    ];

    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedUpdates.includes(key))
    );

    if (Object.keys(sanitizedUpdates).length === 0) {
      const error = new Error('No valid fields to update');
      error.statusCode = 400;
      throw error;
    }

    if (sanitizedUpdates.tags) {
      sanitizedUpdates.tags = parseTags(sanitizedUpdates.tags);
    }
    const updatedContact = await contactRepository.updateByIdAndAccount(contactId, accountId, sanitizedUpdates, projectId);

    // 2-Way Sync: Contact -> Lead (for Pixels Internal project)
    if (updatedContact && accountId === '26042058' && updatedContact.projectId === 'proj_1776957139168') {
      try {
        const phone = updatedContact.whatsappNumber || updatedContact.phone;
        if (phone) {
          const { phoneLookupVariants } = await import('../utils/normalizePhone.js');
          const variants = phoneLookupVariants(phone);
          
          const leadUpdates = {};
          if (sanitizedUpdates.tags) leadUpdates.tags = sanitizedUpdates.tags;
          if (sanitizedUpdates.name) leadUpdates.name = sanitizedUpdates.name;
          if (sanitizedUpdates.email) leadUpdates.email = sanitizedUpdates.email;
          if (sanitizedUpdates.customAttributes && sanitizedUpdates.customAttributes.area) {
            leadUpdates.location = sanitizedUpdates.customAttributes.area;
          }
          if (sanitizedUpdates.leadStatus) {
            const statusMap = {
              'won': 'converted',
              'proposal': 'negotiating',
              'lost': 'stale'
            };
            leadUpdates.status = statusMap[sanitizedUpdates.leadStatus] || sanitizedUpdates.leadStatus;
          }
          
          if (Object.keys(leadUpdates).length > 0) {
            await Lead.updateMany(
              { phone: { $in: variants } },
              { $set: leadUpdates }
            );
          }
        }
      } catch (err) {
        console.error('❌ Error syncing Contact CRM -> Lead in updateContact:', err.message);
      }
    }

    // Trigger Campaign stats recalculation if CRM status/value changed
    if (updatedContact && (sanitizedUpdates.leadStatus !== undefined || sanitizedUpdates.leadValue !== undefined)) {
      setImmediate(async () => {
        try {
          const Campaign = (await import('../models/Campaign.js')).default;
          const { refreshCampaignStatsFromMessages } = await import('./campaignStatsService.js');
          
          const pStr = String(updatedContact.whatsappNumber || updatedContact.phone);
          if (!pStr) return;
          
          const phoneVariations = [pStr, pStr.startsWith('+') ? pStr.substring(1) : `+${pStr}`];
          const matchingCampaigns = await Campaign.find({
            accountId,
            'sentPhones.0': { $exists: true },
            sentPhones: { $in: phoneVariations }
          }).select('_id');
          
          if (matchingCampaigns.length > 0) {
            console.log(`[Realtime Sync] Contact ${pStr} updated. Refreshing ${matchingCampaigns.length} campaigns...`);
            for (const c of matchingCampaigns) {
              await refreshCampaignStatsFromMessages(c._id, accountId);
            }
          }
        } catch (err) {
          console.error(`Failed to refresh campaigns on contact update: ${err.message}`);
        }
      });
    }

    return updatedContact;
  }

  async deleteContact(accountId, contactId, projectId = null) {
    return contactRepository.deleteByIdAndAccount(contactId, accountId, projectId);
  }

  async bulkUpdateContacts(accountId, userId, body = {}) {
    const { contactIds, action, payload = {} } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      const error = new Error('Contact IDs array required');
      error.statusCode = 400;
      throw error;
    }

    if (!action) {
      const error = new Error('Action required (add_tag, remove_tag, assign, delete)');
      error.statusCode = 400;
      throw error;
    }

    let result;

    switch (action) {
      case 'add_tag': {
        if (!payload.tag) {
          const error = new Error('Tag name required');
          error.statusCode = 400;
          throw error;
        }

        result = await contactRepository.updateManyByIds(
          contactIds,
          accountId,
          { $addToSet: { tags: payload.tag } }
        );

        for (const contactId of contactIds) {
          const objectId = contactRepository.toObjectId(contactId);
          if (!objectId) continue;

          await contactTimelineService.logActivity(
            accountId,
            objectId,
            'tag_added',
            { type: 'user', id: userId },
            { tagName: payload.tag },
            `Tag "${payload.tag}" added`
          );
        }
        break;
      }

      case 'remove_tag': {
        if (!payload.tag) {
          const error = new Error('Tag name required');
          error.statusCode = 400;
          throw error;
        }

        result = await contactRepository.updateManyByIds(
          contactIds,
          accountId,
          { $pull: { tags: payload.tag } }
        );

        for (const contactId of contactIds) {
          const objectId = contactRepository.toObjectId(contactId);
          if (!objectId) continue;

          await contactTimelineService.logActivity(
            accountId,
            objectId,
            'tag_removed',
            { type: 'user', id: userId },
            { tagName: payload.tag },
            `Tag "${payload.tag}" removed`
          );
        }
        break;
      }

      case 'assign': {
        if (!payload.assignedTo) {
          const error = new Error('Agent ID required');
          error.statusCode = 400;
          throw error;
        }

        result = await contactRepository.updateManyByIds(
          contactIds,
          accountId,
          { $set: { assignedTo: payload.assignedTo } }
        );

        for (const contactId of contactIds) {
          const objectId = contactRepository.toObjectId(contactId);
          if (!objectId) continue;

          await contactTimelineService.logActivity(
            accountId,
            objectId,
            'assigned',
            { type: 'user', id: userId },
            { agentId: payload.assignedTo, agentName: payload.agentName || 'Agent' },
            `Assigned to ${payload.agentName || 'agent'}`
          );
        }
        break;
      }

      case 'delete': {
        result = await contactRepository.deleteManyByIds(contactIds, accountId);
        break;
      }

      case 'update_status': {
        if (!payload.status) {
          const error = new Error('Status is required for update_status action');
          error.statusCode = 400;
          throw error;
        }

        result = await contactRepository.updateManyByIds(
          contactIds,
          accountId,
          { $set: { leadStatus: payload.status } }
        );

        // 2-way sync: trigger Lead update and Campaign refresh
        setImmediate(async () => {
          try {
            const Campaign = (await import('../models/Campaign.js')).default;
            const Lead = (await import('../models/Lead.js')).default;
            const ChatbotLead = (await import('../models/ChatbotLead.js')).default;
            const { refreshCampaignStatsFromMessages } = await import('./campaignStatsService.js');
            const { phoneLookupVariants } = await import('../utils/normalizePhone.js');
            
            // Get all updated contacts to find their phones
            const updatedContacts = await Contact.find({ _id: { $in: contactIds }, accountId }).select('phone whatsappNumber');
            
            const allPhones = new Set();
            updatedContacts.forEach(c => {
              if (c.phone) allPhones.add(c.phone);
              if (c.whatsappNumber) allPhones.add(c.whatsappNumber);
            });
            
            if (allPhones.size > 0) {
              const phoneVariations = Array.from(allPhones).flatMap(p => phoneLookupVariants(p));
              
              // Sync to Leads
              await Lead.updateMany(
                { accountId, phone: { $in: phoneVariations } },
                { $set: { status: payload.status } }
              );
              
              const chatbotStatusMap = {
                new: 'new',
                contacted: 'contacted',
                converted: 'converted',
                lost: 'rejected'
              };
              if (chatbotStatusMap[payload.status]) {
                 await ChatbotLead.updateMany(
                   { accountId, customerPhone: { $in: phoneVariations } },
                   { $set: { status: chatbotStatusMap[payload.status] } }
                 );
              }
              
              // Refresh matching Campaigns
              const matchingCampaigns = await Campaign.find({
                accountId,
                'sentPhones.0': { $exists: true },
                sentPhones: { $in: phoneVariations }
              }).select('_id');
              
              for (const c of matchingCampaigns) {
                await refreshCampaignStatsFromMessages(c._id, accountId);
              }
            }
          } catch (err) {
             console.error(`Failed bulk update sync: ${err.message}`);
          }
        });
        
        for (const contactId of contactIds) {
          const objectId = contactRepository.toObjectId(contactId);
          if (!objectId) continue;

          await contactTimelineService.logActivity(
            accountId,
            objectId,
            'status_updated',
            { type: 'user', id: userId },
            { newStatus: payload.status },
            `Status changed to ${payload.status}`
          );
        }
        break;
      }

      default: {
        const error = new Error('Invalid action');
        error.statusCode = 400;
        throw error;
      }
    }

    const count = result?.modifiedCount || result?.deletedCount || 0;

    return {
      updated: count,
      failed: contactIds.length - count,
      action
    };
  }

  async getContactTimeline(accountId, contactId, limit = 50, skip = 0) {
    const objectId = contactRepository.toObjectId(contactId);
    if (!objectId) {
      const error = new Error('Invalid contact ID');
      error.statusCode = 400;
      throw error;
    }

    const result = await contactTimelineService.getContactTimeline(
      accountId,
      objectId,
      parseInt(limit, 10),
      parseInt(skip, 10)
    );

    return {
      timeline: result.timeline.map(entry => contactTimelineService.formatTimelineEntry(entry)),
      pagination: result.pagination
    };
  }

  async fetchContactsFromChats(accountId) {
    const conversations = await contactRepository.getRecentConversationsRaw(accountId, 100);

    if (!conversations || conversations.length === 0) {
      return [];
    }

    const existingContacts = await contactRepository.findByAccountIdForPhones(accountId);
    const existingPhones = new Set(
      existingContacts.flatMap(c => [c.whatsappNumber, c.phone]).filter(Boolean)
    );

    const phoneSet = new Set();

    conversations.forEach((conv) => {
      if (conv.senderPhone && !existingPhones.has(conv.senderPhone)) {
        phoneSet.add(conv.senderPhone);
      }
      if (conv.phoneNumber && !existingPhones.has(conv.phoneNumber)) {
        phoneSet.add(conv.phoneNumber);
      }
    });

    return Array.from(phoneSet).map((phone) => ({
      name: `Chat ${phone}`,
      whatsappNumber: phone,
      phone,
      type: ContactType.CUSTOMER,
      tags: ['auto-synced'],
      isOptedIn: true
    }));
  }
}

export default new ContactService();
