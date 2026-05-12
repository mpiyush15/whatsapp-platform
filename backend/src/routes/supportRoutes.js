import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import SupportTicket from '../models/SupportTicket.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const router = express.Router();

const getAccountId = (req) => req.account?.accountId || req.accountId || req.user?.accountId;
const isInternalSupportUser = (req) => {
  const role = String(req.user?.role || '');
  return req.account?.type === 'internal' && (role === 'superadmin' || role === 'support');
};
const getSupportAccountQuery = (req) => {
  if (isInternalSupportUser(req)) {
    if (req.query?.accountId) return { accountId: String(req.query.accountId) };
    return {};
  }

  const accountId = getAccountId(req);
  return accountId ? { accountId } : { accountId: '__missing_account__' };
};

const toTicketView = (ticket) => ({
  _id: ticket._id,
  ticketId: ticket.ticketId,
  conversationId: ticket.conversationId,
  contactPhone: ticket.contactPhone,
  contactName: ticket.contactName,
  subject: ticket.subject,
  description: ticket.description,
  status: ticket.status,
  priority: ticket.priority,
  assigneeName: ticket.assigneeName,
  slaDueAt: ticket.slaDueAt,
  escalated: ticket.escalated,
  source: ticket.source,
  internalNotesCount: ticket.internalNotes?.length || 0,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});

router.get('/overview', async (req, res) => {
  try {
    const accountQuery = getSupportAccountQuery(req);
    const now = new Date();

    const [openCount, inProgressCount, overdueCount, activeConversations] = await Promise.all([
      SupportTicket.countDocuments({ ...accountQuery, status: 'open' }),
      SupportTicket.countDocuments({ ...accountQuery, status: 'in-progress' }),
      SupportTicket.countDocuments({ ...accountQuery, status: { $in: ['open', 'in-progress'] }, slaDueAt: { $lt: now } }),
      Conversation.countDocuments({ ...accountQuery, status: 'open' }),
    ]);

    return sendSuccess(res, {
      openTickets: openCount,
      inProgressTickets: inProgressCount,
      overdueTickets: overdueCount,
      activeConversations,
    }, 'Support overview');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

router.get('/inbox', async (req, res) => {
  try {
    const accountQuery = getSupportAccountQuery(req);

    const conversations = await Conversation.find(accountQuery)
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .select('conversationId userPhone userName userProfileName lastMessageAt lastMessagePreview unreadCount priority status tags')
      .lean();

    return sendSuccess(res, conversations, 'Support inbox conversations');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

router.get('/tickets', async (req, res) => {
  try {
    const accountQuery = getSupportAccountQuery(req);
    const { status, priority, limit = 50 } = req.query;

    const query = { ...accountQuery };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tickets = await SupportTicket.find(query)
      .sort({ updatedAt: -1 })
      .limit(Math.min(Number(limit) || 50, 100))
      .lean();

    return sendSuccess(res, tickets.map(toTicketView), 'Support tickets');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

router.post('/tickets', async (req, res) => {
  try {
    const supportAccountId = getAccountId(req);
    const accountId = req.body?.accountId || supportAccountId;
    const {
      conversationId = null,
      subject,
      description = '',
      priority = 'medium',
      assigneeName = null,
      contactPhone = null,
      contactName = null,
      source = 'manual',
    } = req.body || {};

    if (!subject) {
      return sendError(res, 'subject is required', 400);
    }
    if (!accountId) {
      return sendError(res, 'accountId is required', 400);
    }

    const ticketId = `TKT-${Date.now().toString().slice(-8)}`;
    const slaDueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const ticket = await SupportTicket.create({
      accountId,
      ticketId,
      conversationId,
      subject,
      description,
      priority,
      assigneeName,
      contactPhone,
      contactName,
      slaDueAt,
      source,
      internalNotes: [],
    });

    return sendSuccess(res, toTicketView(ticket), 'Support ticket created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

router.get('/tickets/:ticketId', async (req, res) => {
  try {
    const accountQuery = getSupportAccountQuery(req);
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findOne({
      ...accountQuery,
      $or: [{ ticketId }, { _id: ticketId }],
    }).lean();

    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    let conversationMessages = [];
    if (ticket.conversationId) {
      conversationMessages = await Message.find({ accountId: ticket.accountId, conversationId: ticket.conversationId })
        .sort({ createdAt: -1 })
        .limit(30)
        .select('direction messageType content.text content.caption recipientName createdAt status')
        .lean();
    }

    return sendSuccess(res, {
      ...toTicketView(ticket),
      internalNotes: ticket.internalNotes || [],
      conversationMessages,
    }, 'Support ticket detail');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

router.patch('/tickets/:ticketId', async (req, res) => {
  try {
    const accountQuery = getSupportAccountQuery(req);
    const { ticketId } = req.params;
    const { status, priority, assigneeName, escalated } = req.body || {};

    const update = { updatedAt: new Date() };
    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (typeof assigneeName === 'string') update.assigneeName = assigneeName;
    if (typeof escalated === 'boolean') update.escalated = escalated;

    if (status === 'resolved' || status === 'closed') {
      update.slaDueAt = null;
    }

    const updated = await SupportTicket.findOneAndUpdate(
      { ...accountQuery, $or: [{ ticketId }, { _id: ticketId }] },
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) {
      return sendError(res, 'Ticket not found', 404);
    }

    return sendSuccess(res, toTicketView(updated), 'Support ticket updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

router.post('/tickets/:ticketId/notes', async (req, res) => {
  try {
    const accountQuery = getSupportAccountQuery(req);
    const { ticketId } = req.params;
    const { note } = req.body || {};

    if (!note || !note.trim()) {
      return sendError(res, 'note is required', 400);
    }

    const updated = await SupportTicket.findOneAndUpdate(
      { ...accountQuery, $or: [{ ticketId }, { _id: ticketId }] },
      {
        $push: {
          internalNotes: {
            note: note.trim(),
            createdBy: req.user?.email || req.user?.name || 'support-agent',
            createdAt: new Date(),
          }
        },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    ).lean();

    if (!updated) {
      return sendError(res, 'Ticket not found', 404);
    }

    return sendSuccess(res, {
      ticketId: updated.ticketId,
      internalNotes: updated.internalNotes || [],
    }, 'Internal note added');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
