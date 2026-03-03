import express from 'express';
import conversationController from '../controllers/conversationController.js';
import webhookController from '../controllers/webhookController.js';

const router = express.Router();

/**
 * Conversation Routes
 * Handles inbox conversations
 */

// Get conversations
router.get('/', conversationController.getConversations);
router.get('/:conversationId/messages', conversationController.getConversationMessages);
router.get('/:conversationId/contact-status', conversationController.getContactStatus);

// Reply to conversation
router.post('/:conversationId/reply', conversationController.replyToConversation);

// Update conversation
router.patch('/:conversationId/read', conversationController.markAsRead);
router.patch('/:conversationId/status', conversationController.updateStatus);

// 🔴 LOCAL TESTING ONLY: Simulate incoming webhook message
router.post('/test/simulate-message', async (req, res) => {
  try {
    console.log('\n🧪 SIMULATING WEBHOOK MESSAGE FOR LOCAL TESTING');
    const { phoneNumberId, senderPhone, messageText } = req.body;
    
    if (!phoneNumberId || !senderPhone || !messageText) {
      return res.status(400).json({
        success: false,
        message: 'Missing: phoneNumberId, senderPhone, messageText'
      });
    }
    
    // Simulate webhook body
    const mockWebhookBody = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'entry_id',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              phone_number_id: phoneNumberId,
              display_phone_number: senderPhone
            },
            messages: [{
              id: `msg_${Date.now()}`,
              type: 'text',
              from: senderPhone,
              timestamp: Math.floor(Date.now() / 1000),
              text: {
                body: messageText
              }
            }]
          }
        }]
      }]
    };
    
    // Call webhook handler directly
    req.body = mockWebhookBody;
    
    // Simulate sending response
    const originalSendStatus = res.sendStatus;
    let responseStatus = null;
    res.sendStatus = function(status) {
      responseStatus = status;
      return this;
    };
    
    await webhookController.handleWebhook(req, res);
    
    res.json({
      success: true,
      message: '✅ Test message simulated',
      webhook: mockWebhookBody
    });
  } catch (error) {
    console.error('❌ Test message error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
