// Test script to create a sample profile request for testing
console.log('Setting up test profile request...');

console.log(`
To test the authentication system, please:

1. First, submit a profile request by going to: http://localhost:3000/signup
   Use these test details:
   - Name: Test Faculty
   - Email: test.faculty@rajalakshmi.edu.in  
   - Role: Faculty
   - Department: Computer Science
   - Password: test123

2. Then, login as admin and approve the request:
   - Go to: http://localhost:3000/login
   - Login with: admin@rajalakshmi.edu.in / admin@1234
   - Go to Profile Requests and approve the test faculty request

3. Finally, test the faculty login:
   - Logout as admin
   - Login with: test.faculty@rajalakshmi.edu.in / test123
   - You should be redirected to the faculty dashboard

Alternative: If you want to test with existing credentials, please check what profile requests exist in your database.
`);

console.log('Test instructions printed above. Please follow the steps manually.');
