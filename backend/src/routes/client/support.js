/**
 * CLIENT: Support Tickets
 * Clients can raise and track their own support tickets.
 */

import express from 'express';
import SupportTicket from '../../models/SupportTicket.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';

const router = express.Router();

const toClientTicketView = (ticket) => ({
  _id: ticket._id,
  ticketId: ticket.ticketId,
  subject: ticket.subject,
  description: ticket.description,
  status: ticket.status,
  priority: ticket.priority,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});

router.get('/tickets', async (req, res) => {
  try {
    const accountId = req.user.accountId;

    const tickets = await SupportTicket.find({ accountId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return sendSuccess(res, tickets.map(toClientTicketView), 'Client support tickets');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

router.post('/tickets', async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { subject, description = '', priority = 'medium' } = req.body || {};

    if (!subject || !subject.trim()) {
      return sendError(res, 'subject is required', 400);
    }

    const ticketId = `TKT-${Date.now().toString().slice(-8)}`;
    const slaDueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const ticket = await SupportTicket.create({
      accountId,
      ticketId,
      subject: subject.trim(),
      description: String(description || '').trim(),
      priority,
      contactName: req.user?.name || null,
      source: 'client',
      slaDueAt,
      internalNotes: [],
    });

    return sendSuccess(res, toClientTicketView(ticket), 'Support ticket raised', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
});

export default router;
