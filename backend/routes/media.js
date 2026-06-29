import express from 'express';
import axios from 'axios';
import Account from '../src/models/Account.js';
import { getSignedUrlForS3Object } from '../src/services/s3Service.js';

const router = express.Router();

/**
 * Media Proxy Endpoint
 * Fetches media from S3 OR WhatsApp and serves it through backend
 * This solves CORS issues and allows better control over media access
 */
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Media URL required' });
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(url);

    console.log('📥 Fetching media:', decodedUrl.substring(0, 100) + '...');

    // Check if this is a WhatsApp media URL (contains graph.facebook.com)
    const isWhatsAppMedia = decodedUrl.includes('graph.facebook.com') || decodedUrl.includes('scontent') || decodedUrl.includes('lookaside.fbsbx.com');
    const isS3Media = decodedUrl.includes('amazonaws.com');
    
    // If it's an S3 URL, the signature might be expired. Generate a fresh one and redirect!
    if (isS3Media) {
      try {
        const urlObj = new URL(decodedUrl);
        const s3Key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
        console.log(`🔄 Generating fresh S3 signed URL for key: ${s3Key}`);
        
        const freshSignedUrl = await getSignedUrlForS3Object(s3Key, 3600); // 1 hour expiry
        console.log(`✅ Redirecting to fresh S3 URL`);
        return res.redirect(freshSignedUrl);
      } catch (err) {
        console.error('⚠️ Could not refresh S3 URL:', err.message);
        // Fallback to proxying the original (likely expired) URL
      }
    }
    
    // Build request headers
    const headers = {
      'User-Agent': 'Replysys-Media-Proxy/1.0'
    };
    
    // Add authorization if it's WhatsApp media
    let targetUrl = decodedUrl;
    
    if (isWhatsAppMedia && req.accountId) {
      const account = await Account.findOne({ accountId: req.accountId }).select('+whatsappAccessToken');
      if (account && account.whatsappAccessToken) {
        headers['Authorization'] = `Bearer ${account.whatsappAccessToken}`;
        console.log('🔐 Using WhatsApp Bearer token from account for media fetch');
        
        // If it's a lookaside URL with a media ID (mid), it might be expired.
        // Let's proactively fetch a fresh URL from Meta.
        try {
          const urlObj = new URL(decodedUrl);
          const mid = urlObj.searchParams.get('mid');
          if (mid) {
            console.log(`🔄 Fetching fresh media URL for media ID: ${mid}`);
            const metaRes = await axios.get(`https://graph.facebook.com/v20.0/${mid}`, {
              headers: { 'Authorization': `Bearer ${account.whatsappAccessToken}` }
            });
            if (metaRes.data && metaRes.data.url) {
              targetUrl = metaRes.data.url;
              console.log(`✅ Fresh media URL obtained`);
            }
          }
        } catch (refreshErr) {
          console.error('⚠️ Could not refresh media URL from Meta:', refreshErr.message);
        }
      }
    }

    // Fetch from URL with timeout
    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: headers
    });

    // Extract content type and file size
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const contentLength = response.headers['content-length'];

    // Set proper headers for browser caching and display
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=604800'); // 1 week cache
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    
    if (contentLength) {
      res.set('Content-Length', contentLength);
    }

    // Send the media
    res.send(response.data);

    console.log('✅ Media served successfully');
  } catch (error) {
    console.error('❌ Media proxy error:', error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Media not found' });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Media fetch timeout' });
    }

    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

/**
 * Download Endpoint
 * Serves media with attachment header for downloads
 */
router.get('/download', async (req, res) => {
  try {
    const { url, fileName } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Media URL required' });
    }

    const decodedUrl = decodeURIComponent(url);
    const decodedFileName = fileName ? decodeURIComponent(fileName) : 'download';

    console.log('📥 Downloading media:', decodedFileName);

    // Fetch from S3
    const response = await axios.get(decodedUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const contentType = response.headers['content-type'] || 'application/octet-stream';

    // Set download headers
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `attachment; filename="${decodedFileName}"`);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    res.send(response.data);

    console.log('✅ Media downloaded');
  } catch (error) {
    console.error('❌ Download error:', error.message);
    res.status(500).json({ error: 'Failed to download media' });
  }
});

export default router;
