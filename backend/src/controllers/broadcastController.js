import broadcastService from '../services/broadcastService.js';
import broadcastExecutionService from '../services/broadcastExecutionService.js';
import PhoneNumber from '../models/PhoneNumber.js';

export const createBroadcast = async (req, res) => {
  try {
    // Get accountId from JWT middleware (String format for consistent system usage)
    const accountId = req.account.accountId;
    let phoneNumberId = req.params.phoneNumberId || req.body.phoneNumberId;
    const data = req.body;

    // If phoneNumberId not provided, fetch the first active phone number for the account
    if (!phoneNumberId || phoneNumberId === 'default') {
      const activePhone = await PhoneNumber.findOne({
        accountId: accountId,  // Use String accountId for database query (consistent with system)
        isActive: true
      });

      if (!activePhone) {
        return res.status(400).json({
          success: false,
          message: 'No WhatsApp phone number configured. Please add your phone number before creating broadcasts.',
          error: 'NO_PHONE_CONFIGURED',
          nextStep: 'Go to Settings → WhatsApp Integration → Add Phone Number'
        });
      }

      phoneNumberId = activePhone.phoneNumberId;
    }

    // Pass String accountId to service (consistent with system)
    const broadcast = await broadcastService.createBroadcast(
      accountId,  // ✅ Use String accountId (consistent with system)
      phoneNumberId,
      data
    );

    res.status(201).json({
      success: true,
      data: broadcast
    });
  } catch (error) {
    console.error('Error creating broadcast:', error);
    
    let message = 'Failed to create broadcast.';
    let errorCode = 'CREATE_BROADCAST_ERROR';
    let nextStep = 'Please try again or contact support.';
    
    if (error.message?.includes('phone') || error.message?.includes('Phone')) {
      message = 'Phone number not configured. Please add your WhatsApp phone number first.';
      errorCode = 'PHONE_NOT_CONFIGURED';
      nextStep = 'Go to Settings → WhatsApp Integration to add your phone number.';
    } else if (error.message?.includes('contact') || error.message?.includes('recipient')) {
      message = 'Invalid contacts in broadcast. Please check the recipient list.';
      errorCode = 'INVALID_CONTACTS';
      nextStep = 'Verify all phone numbers are valid and properly formatted.';
    } else if (error.message?.includes('template')) {
      message = 'Invalid template selected. Please choose an approved template.';
      errorCode = 'INVALID_TEMPLATE';
      nextStep = 'Select a different template or create a new one.';
    }
    
    res.status(400).json({
      success: false,
      message: message,
      error: errorCode,
      details: error.message,
      nextStep
    });
  }
};

export const getBroadcasts = async (req, res) => {
  try {
    // Get accountId from JWT middleware - use String accountId (consistent with system)
    const accountId = req.account.accountId;
    const phoneNumberId = req.params.phoneNumberId || 'any';
    const { status, limit, skip } = req.query;

    const result = await broadcastService.getBroadcasts(
      accountId,
      phoneNumberId,
      { status, limit: parseInt(limit) || 50, skip: parseInt(skip) || 0 }
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting broadcasts:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to fetch broadcasts. Please try again.',
      error: 'GET_BROADCASTS_ERROR',
      details: error.message
    });
  }
};

export const getBroadcastById = async (req, res) => {
  try {
    // Get accountId from JWT middleware - use String accountId (consistent with system)
    const accountId = req.account.accountId;
    
    // Get broadcastId from params - could be from different route formats:
    // 1. GET /api/broadcasts/:broadcastId
    // 2. GET /api/:accountId/broadcasts/:broadcastId
    const broadcastId = req.params.broadcastId || req.params.accountId;
    
    if (!broadcastId) {
      return res.status(400).json({
        success: false,
        message: 'Broadcast ID is required.',
        error: 'MISSING_BROADCAST_ID'
      });
    }
    
    const broadcast = await broadcastService.getBroadcastById(accountId, broadcastId);

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found. It may have been deleted.',
        error: 'BROADCAST_NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      data: broadcast
    });
  } catch (error) {
    console.error('Error getting broadcast:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to fetch broadcast details. Please try again.',
      error: 'GET_BROADCAST_ERROR',
      details: error.message
    });
  }
};

export const updateBroadcast = async (req, res) => {
  try {
    const { accountId, broadcastId } = req.params;
    const data = req.body;

    const broadcast = await broadcastService.updateBroadcast(accountId, broadcastId, data);

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        error: 'Broadcast not found'
      });
    }

    res.status(200).json({
      success: true,
      data: broadcast
    });
  } catch (error) {
    console.error('Error updating broadcast:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const startBroadcast = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId (consistent with system)
    const broadcastId = req.params.broadcastId;

    // First get the broadcast to extract phoneNumberId
    const broadcast = await broadcastService.getBroadcastById(accountId, broadcastId);
    
    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found. It may have been deleted.',
        error: 'BROADCAST_NOT_FOUND'
      });
    }

    // Validate broadcast status
    const allowedStatuses = ['draft', 'paused', 'scheduled'];
    if (!allowedStatuses.includes(broadcast.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot start broadcast in ${broadcast.status} status. Only draft, paused, or scheduled broadcasts can be started.`,
        error: 'INVALID_BROADCAST_STATUS',
        currentStatus: broadcast.status,
        allowedStatuses
      });
    }

    // Use phoneNumberId from broadcast, fallback to body or params
    const phoneNumberId = req.params.phoneNumberId || req.body.phoneNumberId || broadcast.phoneNumberId;
    
    if (!phoneNumberId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number not configured for this broadcast. Add a phone number in Settings first.',
        error: 'MISSING_PHONE_NUMBER',
        nextStep: 'Go to Settings → WhatsApp Integration to add your phone number.'
      });
    }

    // Start the broadcast
    const updatedBroadcast = await broadcastService.startBroadcast(accountId, broadcastId);

    // Check if this is a scheduled broadcast
    if (updatedBroadcast.status === 'scheduled') {
      return res.status(200).json({
        success: true,
        message: `Broadcast scheduled successfully. It will be sent on ${new Date(updatedBroadcast.scheduling.scheduledTime).toLocaleString()}.`,
        data: updatedBroadcast,
        scheduledFor: updatedBroadcast.scheduling.scheduledTime
      });
    }

    // For immediate broadcasts, execute asynchronously
    broadcastExecutionService.executeBroadcast(
      accountId,
      broadcastId,
      phoneNumberId
    ).catch(err => console.error('Broadcast execution error:', err));

    res.status(200).json({
      success: true,
      message: 'Broadcast started successfully. Messages will be sent to all recipients.',
      data: updatedBroadcast
    });
  } catch (error) {
    console.error('Error starting broadcast:', error);
    
    let message = 'Failed to start broadcast.';
    let errorCode = 'START_BROADCAST_ERROR';
    let nextStep = 'Please try again.';

    
    if (error.message?.includes('permission') || error.message?.includes('Permission')) {
      message = 'Permission denied. You may not have access to this broadcast.';
      errorCode = 'PERMISSION_DENIED';
      nextStep = 'Verify your account has permission to manage broadcasts.';
    } else if (error.message?.includes('contact') || error.message?.includes('recipient')) {
      message = 'Invalid recipient list. Some phone numbers may be invalid or blocked.';
      errorCode = 'INVALID_RECIPIENTS';
      nextStep = 'Check your contact list and remove invalid numbers.';
    } else if (error.message?.includes('rate')) {
      message = 'Too many broadcasts running. Please wait before starting another.';
      errorCode = 'RATE_LIMITED';
      nextStep = 'Wait a moment and try again.';
    }
    
    res.status(400).json({
      success: false,
      message: message,
      error: errorCode,
      details: error.message,
      nextStep
    });
  }
};

export const cancelBroadcast = async (req, res) => {
  try {
    const { accountId, broadcastId } = req.params;

    const broadcast = await broadcastService.cancelBroadcast(accountId, broadcastId);

    res.status(200).json({
      success: true,
      message: 'Broadcast cancelled',
      data: broadcast
    });
  } catch (error) {
    console.error('Error cancelling broadcast:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getBroadcastStats = async (req, res) => {
  try {
    const { accountId, broadcastId } = req.params;

    const stats = await broadcastService.getBroadcastStats(accountId, broadcastId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting broadcast stats:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteBroadcast = async (req, res) => {
  try {
    // Get accountId from JWT middleware - use ObjectId for database queries (single source of truth)
    const accountId = req.account._id;
    
    // Get broadcastId from params
    const broadcastId = req.params.broadcastId || req.params.accountId;
    
    if (!broadcastId) {
      return res.status(400).json({
        success: false,
        error: 'Broadcast ID is required'
      });
    }

    const result = await broadcastService.deleteBroadcast(accountId, broadcastId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Broadcast not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Broadcast deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
