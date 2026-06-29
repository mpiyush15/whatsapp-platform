import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { buildAuthenticationSubmitComponents } from './src/controllers/templateController.js'; // This is not exported, so we must copy the exact logic from templateController to verify

dotenv.config();

function buildAuth() {
  // Simulating exact logic inside templateController.js
  let components;
  const isAuthentication = true;

  if (isAuthentication) {
    // Meta STRICTLY FORBIDS having a 'text' property in the BODY of Authentication templates.
    // We must completely rebuild it using their strict structure.
    components = [
      {
        type: 'BODY',
        add_security_recommendation: true
      },
      {
        type: 'FOOTER',
        code_expiration_minutes: 10
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'OTP',
            otp_type: 'COPY_CODE'
          }
        ]
      }
    ];

    const buttonIdx = components.findIndex(c => c.type === 'BUTTONS');
    if (buttonIdx >= 0) {
      const otpButton = components[buttonIdx].buttons?.find(b => b.type === 'OTP');
      if (otpButton) {
        otpButton.text = 'Copy Code'; // Meta strict requirement
      }
    }
  }

  const payload = {
    name: "test_auth_template_123",
    language: "en_US",
    category: "AUTHENTICATION",
    components,
    message_send_ttl_seconds: 600
  };

  console.log("FINAL GENERATED PAYLOAD FOR AUTHENTICATION TEMPLATE:");
  console.log(JSON.stringify(payload, null, 2));
}

buildAuth();
