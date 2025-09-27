# Debug Steps for Authentication Issues

## Step 1: Check Backend Routes are Working

Open your browser and test these URLs:

1. **General Health Check**: http://localhost:5001/health
   - Should return: `{"status": "OK", ...}`

2. **Profile Auth Health Check**: http://localhost:5001/api/profile-auth/health
   - Should return: `{"status": "Profile auth routes are working", ...}`

3. **Check Database Content**: http://localhost:5001/api/profile-auth/debug/requests
   - This will show all profile requests in the database
   - If empty, you need to create a profile request first

## Step 2: Create Test Profile Request (if needed)

1. Go to: http://localhost:3000/signup
2. Fill in these details:
   - **Name**: Test Faculty
   - **Email**: test.faculty@rajalakshmi.edu.in
   - **Role**: Faculty
   - **Department**: Computer Science
   - **Password**: test123
3. Submit the form

## Step 3: Approve Profile Request

1. Go to: http://localhost:3000/login
2. Login as admin: `admin@rajalakshmi.edu.in` / `admin@1234`
3. Go to "Profile Requests" section
4. Approve the test faculty request

## Step 4: Test Faculty Login

1. Logout from admin account
2. Go to: http://localhost:3000/login
3. Try to login with: `test.faculty@rajalakshmi.edu.in` / `test123`

## Step 5: Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Try the login again
4. Look for any error messages or logs

## Common Issues to Check:

1. **Backend not running**: Check if you see server logs
2. **Database connection**: Check if the database queries are working
3. **CORS issues**: Check if there are CORS-related errors in console
4. **Wrong endpoint**: Verify the frontend is calling `/api/profile-auth/login`

## Expected Console Logs

When you try to login, you should see these logs in the browser console:
```
Starting login process for: test.faculty@rajalakshmi.edu.in
Attempting profile-based authentication...
Profile auth response: {success: true, user: {...}}
Profile authentication successful, setting user: {...}
```

If you see network errors or different messages, that will help identify the issue.
