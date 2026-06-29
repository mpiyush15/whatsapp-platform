// Centralized JWT Secret configuration
// Ensures all JWT operations use the same secret

const JWT_SECRET = process.env.JWT_SECRET || 'whatsapp-platform-jwt-secret-2026';

console.log('🔐 JWT Configuration Loaded:');
console.log('   Using JWT_SECRET from:', !!process.env.JWT_SECRET ? 'Environment (.env)' : 'Hardcoded default');
console.log('   JWT_SECRET length:', JWT_SECRET.length);
console.log('   JWT_SECRET first 20 chars:', JWT_SECRET.substring(0, 20) + '...');

export { JWT_SECRET };
