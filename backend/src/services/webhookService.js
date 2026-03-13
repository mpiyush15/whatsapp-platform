import crypto from 'crypto';
import Account from '../models/Account.js';

/**
 * Webhook Service
 * Handles sending webhook events to external integrations (Enromatics, Zapier, etc.)
 */
class WebhookService {
  /**
   * Sign webhook payload with HMAC-SHA256
   */
  static signPayload(payload, secret) {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return signature;
  }

  /**
   * Send webhook event to client (Enromatics, Zapier, etc.)
   */
  static async sendWebhook(accountId, eventType, eventData) {
    try {
      // Get account webhook config
      const account = await Account.findById(accountId);
      
      if (!account?.webhookUrl || !account?.webhookSecret || !account?.webhookEnabled) {
        console.log(`⚠️  No webhook config for account ${accountId}`);
        return null;
      }

      // Check if event type is enabled
      if (account.webhookEvents && !account.webhookEvents.includes(eventType)) {
        console.log(`⚠️  Event ${eventType} not enabled for account ${accountId}`);
        return null;
      }

      // Build webhook payload
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        accountId: accountId,
        data: eventData
      };

      // Sign payload
      const signature = this.signPayload(payload, account.webhookSecret);

      // Send webhook
      console.log(`📤 Sending webhook to ${account.name}:`, eventType);
      
      const response = await fetch(account.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Event-Type': eventType,
          'X-Timestamp': payload.timestamp
        },
        body: JSON.stringify(payload),
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        console.error(`❌ Webhook failed for ${account.name}:`, response.status);
        return { success: false, status: response.status };
      }

      console.log(`✅ Webhook sent to ${account.name}`);
      
      // Update last webhook sent timestamp (async, don't wait)
      Account.updateOne(
        { _id: account._id },
        { webhookLastSentAt: new Date() }
      ).catch(err => console.error('Error updating webhookLastSentAt:', err));

      return { success: true, status: response.status };
    } catch (error) {
      console.error(`❌ Webhook error for account ${accountId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message received event
   */
  static async notifyMessageReceived(accountId, conversationId, message) {
    return this.sendWebhook(accountId, 'message:received', {
      conversationId,
      message: {
        id: message._id,
        text: message.text,
        sender: message.sender,
        timestamp: message.timestamp,
        mediaUrl: message.mediaUrl
      }
    });
  }

  /**
   * Send message sent event
   */
  static async notifyMessageSent(accountId, messageId, status = 'sent') {
    return this.sendWebhook(accountId, 'message:sent', {
      messageId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send delivery status event
   */
  static async notifyDeliveryStatus(accountId, messageId, status) {
    return this.sendWebhook(accountId, 'message:' + status, {
      messageId,
      status,
      timestamp: new Date().toISOString()
    });
  }
}

export default WebhookService;
