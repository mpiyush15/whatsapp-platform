import express from 'express'
import DemoRequest from '../models/DemoRequest.js'
import { emailService } from '../services/emailService.js'
import { requireJWT } from '../middlewares/jwtAuth.js'
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router()

// Book a demo (PUBLIC)
router.post('/book', async (req, res) => {
  try {
    const { name, email, phone, company, message } = req.body

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' })
    }

    // Check if email already has a pending request
    const existingRequest = await DemoRequest.findOne({
      email,
      status: { $in: ['pending', 'scheduled'] }
    })

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending demo request' })
    }

    // Create demo request
    const demoRequest = new DemoRequest({
      name,
      email,
      phone,
      company,
      message,
      status: 'pending',
      requestedAt: new Date(),
    })

    await demoRequest.save()

    // Send email to user
    await emailService.sendEmail(
      email,
      'Demo Request Received - Replysys',
      `
        <h2>Thank you for your interest, ${name}!</h2>
        <p>We've received your demo request. Our team will contact you soon to schedule your demo.</p>
        <p><strong>Your Details:</strong></p>
        <ul>
          <li>Name: ${name}</li>
          <li>Email: ${email}</li>
          <li>Phone: ${phone || 'Not provided'}</li>
          <li>Company: ${company || 'Not provided'}</li>
        </ul>
        <p>We'll be in touch within 24 hours!</p>
        <p>Best regards,<br/>Replysys Team</p>
      `
    )

    // Send email to support
    await emailService.sendEmail(
      'support@replysys.com',
      `New Demo Request: ${name}`,
      `
        <h2>New Demo Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Company:</strong> ${company || 'Not provided'}</p>
        <p><strong>Message:</strong> ${message || 'No message'}</p>
        <p><a href="${process.env.ADMIN_DASHBOARD_URL || 'https://replysys.com/superadmin'}/demo-requests/${demoRequest._id}">View in Dashboard</a></p>
      `
    )

    res.status(201).json({
      message: 'Demo request created successfully',
      demoRequest
    })
  } catch (error) {
    logger.error('Error booking demo:', error)
    res.status(500).json({ message: 'Failed to book demo' })
  }
})

// Get all demo requests (ADMIN ONLY)
router.get('/', requireJWT, async (req, res) => {
  try {
    // Verify admin role
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const demoRequests = await DemoRequest.find().sort({ requestedAt: -1 })
    res.json({ demoRequests })
  } catch (error) {
    logger.error('Error fetching demo requests:', error)
    res.status(500).json({ message: 'Failed to fetch demo requests' })
  }
})

// Get single demo request (ADMIN ONLY)
router.get('/:id', requireJWT, async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const demoRequest = await DemoRequest.findById(req.params.id)
    if (!demoRequest) {
      return res.status(404).json({ message: 'Demo request not found' })
    }

    res.json({ demoRequest })
  } catch (error) {
    logger.error('Error fetching demo request:', error)
    res.status(500).json({ message: 'Failed to fetch demo request' })
  }
})

// Confirm demo (ADMIN ONLY)
router.post('/:id/confirm', requireJWT, async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const { scheduledDate, scheduledTime, notes } = req.body

    if (!scheduledDate || !scheduledTime) {
      return res.status(400).json({ message: 'Scheduled date and time are required' })
    }

    const demoRequest = await DemoRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'scheduled',
        scheduledDate,
        scheduledTime,
        notes,
        confirmedAt: new Date(),
        confirmedBy: req.user.id,
      },
      { new: true }
    )

    if (!demoRequest) {
      return res.status(404).json({ message: 'Demo request not found' })
    }

    // Send confirmation email to customer
    await emailService.sendEmail(
      demoRequest.email,
      'Demo Scheduled - Replysys',
      `
        <h2>Your Demo is Scheduled!</h2>
        <p>Hi ${demoRequest.name},</p>
        <p>We've scheduled your Replysys demo:</p>
        <p>
          <strong>Date:</strong> ${new Date(scheduledDate).toLocaleDateString()}<br/>
          <strong>Time:</strong> ${scheduledTime}<br/>
          ${notes ? `<strong>Notes:</strong> ${notes}<br/>` : ''}
        </p>
        <p>Our team will connect with you on the scheduled time.</p>
        <p>Best regards,<br/>Replysys Team</p>
      `
    )

    res.json({
      message: 'Demo confirmed and email sent to customer',
      demoRequest
    })
  } catch (error) {
    logger.error('Error confirming demo:', error)
    res.status(500).json({ message: 'Failed to confirm demo' })
  }
})

// Cancel demo (ADMIN ONLY)
router.post('/:id/cancel', requireJWT, async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const demoRequest = await DemoRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    )

    if (!demoRequest) {
      return res.status(404).json({ message: 'Demo request not found' })
    }

    res.json({
      message: 'Demo request cancelled',
      demoRequest
    })
  } catch (error) {
    logger.error('Error cancelling demo:', error)
    res.status(500).json({ message: 'Failed to cancel demo' })
  }
})

export default router
