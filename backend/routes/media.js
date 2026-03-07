import express from 'express';
import axios from 'axios';
import { authenticate } from '../src/middlewares/auth.js';

const router = express.Router();

/**
 * Media Proxy Endpoint
 * Fetches media from S3 and serves it through backend
 * This solves CORS issues and allows better control over media access
 */
router.get('/proxy', authenticate, async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Media URL required' });
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(url);

    console.log('📥 Fetching media:', decodedUrl.substring(0, 100) + '...');

    // Fetch from S3 with timeout
    const response = await axios.get(decodedUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Replysys-Media-Proxy/1.0'
      }
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
router.get('/download', authenticate, async (req, res) => {
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
