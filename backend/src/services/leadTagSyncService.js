import Lead from '../models/Lead.js';
import ChatbotLead from '../models/ChatbotLead.js';
import Contact from '../models/Contact.js';
import Conversation from '../models/Conversation.js';

export function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((tag) => String(tag || '').trim())
      .filter(Boolean)
  )];
}

export async function syncTagsForPhone(accountId, phone, tags, { projectId = null } = {}) {
  const cleanPhone = String(phone || '').replace(/[\s+()-]/g, '');
  const nextTags = normalizeTags(tags);
  if (!accountId || !cleanPhone) return;

  await Promise.all([
    Lead.updateMany(
      {
        accountId,
        ...(projectId ? { projectId } : {}),
        phone: cleanPhone,
      },
      { $set: { tags: nextTags, updatedAt: new Date() } }
    ),
    ChatbotLead.updateMany(
      {
        accountId,
        ...(projectId ? { projectId } : {}),
        customerPhone: cleanPhone,
      },
      { $set: { tags: nextTags, updatedAt: new Date() } }
    ),
    Contact.updateMany(
      {
        accountId,
        ...(projectId ? { projectId } : {}),
        $or: [{ phone: cleanPhone }, { whatsappNumber: cleanPhone }],
      },
      { $set: { tags: nextTags, updatedAt: new Date() } }
    ),
    Conversation.updateMany(
      {
        accountId,
        ...(projectId ? { projectId } : {}),
        userPhone: cleanPhone,
      },
      { $set: { tags: nextTags, updatedAt: new Date() } }
    ),
  ]);
}

export async function syncTagsFromConversation(accountId, conversationId, tags) {
  const conversation = await Conversation.findOne({ accountId, conversationId }).lean();
  if (!conversation) return;
  await syncTagsForPhone(accountId, conversation.userPhone, tags, {
    projectId: conversation.projectId || null,
  });
}

