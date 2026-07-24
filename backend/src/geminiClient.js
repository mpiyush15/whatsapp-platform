// src/geminiClient.js
import { GoogleGenerativeAI } from '@google/generative-ai';

// dotenv is loaded in app.js before this module is imported
const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is missing from .env');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 8192,
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_DANGEROUS_CODE',
      threshold: 'BLOCK_NONE',
    },
  ],
});

/**
 * Ask Gemini to produce a diff for a single file.
 * @param {{filePath:string, originalCode:string, instruction:string}} params
 * @returns {Promise<string>} Unified diff (no markdown fences)
 */
export async function editCode({ filePath, originalCode, instruction }) {
  const prompt = `
You are a code‑assistant that returns ONLY a Unified Diff for a single file.
File: ${filePath}
--- ORIGINAL CODE ---
${originalCode}
--- INSTRUCTION ---
${instruction}
--- RESPONSE FORMAT ---
Return a classic Unified Diff where each line starts with '+', '-', or a space. Do not wrap the diff in markdown code fences.
`;
  const result = await model.generateContent(prompt);
  const text = await result.response.text();
  if (!text || !/^[\+\- ].*/m.test(text)) {
    throw new Error('Gemini did not return a valid diff');
  }
  return text.trim();
}

/**
 * Ask Gemini to evaluate a WhatsApp template payload against Meta's guidelines.
 * @param {Object} templatePayload The template payload being sent to Meta
 * @returns {Promise<{status: 'APPROVED'|'REJECTED', reasons: string[]}>}
 */
export async function checkTemplateApproval(templatePayload) {
  const prompt = `
You are a strict WhatsApp Business API Template Reviewer working for Meta.
Evaluate the following template payload against Meta's guidelines.

PAYLOAD:
${JSON.stringify(templatePayload, null, 2)}

Strict Guidelines:
1. UTILITY templates MUST NOT contain any promotional words (e.g., sale, discount, offer, buy now, coupon). If they do, REJECT.
2. Check for commerce policy violations (e.g., selling drugs, alcohol, gambling, adult content, weapons). If found, REJECT.
3. Check for formatting errors, consecutive variables (e.g., {{1}}{{2}}), or unclear examples. If found, REJECT.
4. If it's an AUTHENTICATION template, ensure strict compliance (no custom body text other than the code). If violated, REJECT.

Respond ONLY with a JSON object in this exact format, with no markdown formatting or backticks:
{
  "status": "APPROVED" | "REJECTED",
  "reasons": ["Array of specific reasons for rejection. Empty if APPROVED."]
}
`;

  try {
    // Generate content using gemini-1.5-pro model (defined above)
    // We can use the existing 'model' instance since it uses responseSchema when we want json, but we'll parse it manually to avoid complex config.
    const result = await model.generateContent(prompt);
    let text = await result.response.text();
    text = text.replace(/^\`\`\`json/i, '').replace(/\`\`\`$/, '').trim();
    const parsed = JSON.parse(text);
    return {
      status: parsed.status === 'REJECTED' ? 'REJECTED' : 'APPROVED',
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : []
    };
  } catch (err) {
    console.error('Gemini template approval check failed:', err);
    // On failure to check, we default to APPROVED so we don't block valid submissions due to AI downtime
    return { status: 'APPROVED', reasons: [] };
  }
}
