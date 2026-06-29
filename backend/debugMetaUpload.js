import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config({ path: '.env' });

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0';
const appId = process.env.META_APP_ID;

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Template = (await import('./src/models/Template.js')).default;
  const Account = (await import('./src/models/Account.js')).default;
  
  // Find a template that has a mediaUrl
  const template = await Template.findOne({ hasMedia: true, mediaUrl: { $ne: null } }).sort({ createdAt: -1 });
  if (!template) {
    console.log('No template found with media');
    process.exit(1);
  }
  console.log('Found Template:', template.name);

  // Get phone config
  const account = await Account.findById(template.accountId);
  const wabaToken = account.whatsappConfig?.systemUserToken;
  if (!wabaToken) {
    console.log('No system token found');
    process.exit(1);
  }

  try {
    const mediaUrl = template.mediaUrl;
    console.log('Downloading media from:', mediaUrl);
    const mediaResp = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(mediaResp.data);
    const contentType = mediaResp.headers['content-type'] || 'image/jpeg';
    console.log('Downloaded file size:', fileBuffer.length, 'bytes');

    console.log('Step 1: create upload session');
    const sessionResp = await axios.post(
      `${GRAPH_API_URL}/${appId}/uploads`,
      null,
      {
        params: {
          file_name: 'test.jpg',
          file_length: fileBuffer.length,
          file_type: contentType,
        },
        headers: {
          Authorization: `Bearer ${wabaToken}`,
        },
      }
    );
    console.log('Session Resp:', sessionResp.data);

    const uploadSessionId = sessionResp.data?.id;
    
    console.log('Step 2: upload binary');
    const handleResp = await axios.post(
      `${GRAPH_API_URL}/${uploadSessionId}`,
      fileBuffer,
      {
        headers: {
          Authorization: `Bearer ${wabaToken}`,
          'file_offset': '0',
          'Content-Type': 'application/octet-stream',
        },
      }
    );
    console.log('Handle Resp:', handleResp.data);
    
  } catch (err) {
    console.log('ERROR:', err.response?.data || err.message);
  }
  process.exit(0);
}
test();
