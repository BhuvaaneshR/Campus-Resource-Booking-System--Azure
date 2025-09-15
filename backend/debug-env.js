const dotenv = require('dotenv');

// Load environment variables
console.log('Loading .env file...');
const result = dotenv.config();

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Environment variables loaded successfully');
}

console.log('\nDatabase Environment Variables:');
console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***HIDDEN***' : 'NOT SET');
console.log('DB_ENCRYPT:', process.env.DB_ENCRYPT);

console.log('\nAll environment variables:', Object.keys(process.env).filter(key => key.startsWith('DB_')));
