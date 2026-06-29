import logger from '../utils/logger.js';
import axios from 'axios';

/**
 * Fetch media URL from Meta WhatsApp API
 * @param {string} mediaId - The media ID from webhook
 * @param {string} accessToken - WhatsApp access token
 * @returns {Promise<string>} - The media URL
 */
export const fetchMediaUrl = async (mediaId, accessToken) => {
  try {
    if (!mediaId || !accessToken) {
      throw new Error('Missing mediaId or accessToken');
    }

    logger.info(`🔗 Fetching media URL for ID: ${mediaId}`);

    // Call Meta API to get media URL
    const response = await axios.get(
      `https://graph.instagram.com/v18.0/${mediaId}`,
      {
        params: {
          fields: 'media_product_type,url',
          access_token: accessToken
        },
        timeout: 5000
      }
    );

    const mediaUrl = response.data?.url;
    if (!mediaUrl) {
      throw new Error('No URL in Meta response');
    }

    logger.info(`✅ Media URL fetched: ${mediaUrl.substring(0, 80)}...`);
    return mediaUrl;
  } catch (error) {
    logger.error(`❌ Error fetching media URL: ${error.message}`);
    return null;
  }
};

export default {
  fetchMediaUrl
};
