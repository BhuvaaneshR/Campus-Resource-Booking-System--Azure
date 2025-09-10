# 🔐 Microsoft Entra ID Setup Guide for Campus Resource Booking System

## 📋 Prerequisites
- Azure subscription
- Admin access to Azure Portal
- College Gmail domain: `@rajalakshmi.edu.in`

## 🚀 Step 1: Azure Portal Setup

### 1.1 Create App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**
4. Fill in the details:
   - **Name**: `Campus Resource Booking System`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: `Single-page application (SPA)` → `http://localhost:3000`
5. Click **"Register"**

### 1.2 Get Application Details
After registration, note down:
- **Application (client) ID**: Copy this value
- **Directory (tenant) ID**: Copy this value

### 1.3 Configure Authentication
1. In your app registration, go to **"Authentication"**
2. Under **"Single-page application"**, add:
   - `http://localhost:3000` (for development)
   - `https://your-app-name.azurewebsites.net` (for production)
3. Under **"Advanced settings"**:
   - Enable **"Allow public client flows"**: `Yes`
4. Click **"Save"**

### 1.4 Configure Domain Validation
1. Go to **"Token configuration"**
2. Click **"Add optional claim"**
3. Select **"Access"** tokens
4. Add claims:
   - `email`
   - `upn` (User Principal Name)
5. Click **"Add"**

### 1.5 Set up API Permissions
1. Go to **"API permissions"**
2. Click **"Add a permission"**
3. Select **"Microsoft Graph"**
4. Choose **"Delegated permissions"**
5. Add:
   - `User.Read`
   - `email`
   - `openid`
   - `profile`
6. Click **"Grant admin consent"**

## 🔧 Step 2: Environment Configuration

### 2.1 Frontend Environment Variables
Create `frontend/.env.local` file:
```env
# Microsoft Entra ID Configuration
REACT_APP_AZURE_CLIENT_ID=your-client-id-here
REACT_APP_AZURE_TENANT_ID=your-tenant-id-here
REACT_APP_REDIRECT_URI=http://localhost:3000

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:5001/api
```

### 2.2 Backend Environment Variables
Create `backend/.env` file:
```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database Configuration
DB_SERVER=your-sql-server.database.windows.net
DB_NAME=campus_booking_db
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Microsoft Entra ID Configuration
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
AZURE_TENANT_ID=your-tenant-id-here
```

## 🗄️ Step 3: Database Setup

### 3.1 Create Admin User
Run this SQL script in your SQL Server database:
```sql
-- Insert a Portal Admin user
INSERT INTO Users (email, name, role, isActive, createdAt)
VALUES ('admin@rajalakshmi.edu.in', 'Portal Admin', 'Portal Admin', 1, GETDATE());
```

### 3.2 Add Sample Resources
```sql
-- Insert sample resources
INSERT INTO Resources (name, type, location, capacity, isActive, createdAt)
VALUES 
('Main Auditorium', 'Auditorium', 'Main Building', 500, 1, GETDATE()),
('Computer Lab 1', 'Laboratory', 'IT Building', 30, 1, GETDATE()),
('Conference Room A', 'Meeting Room', 'Admin Building', 20, 1, GETDATE()),
('Sports Hall', 'Sports Facility', 'Sports Complex', 100, 1, GETDATE());
```

## 🧪 Step 4: Testing

### 4.1 Start the Application
```bash
# Start backend
cd backend
npm run dev

# Start frontend (in new terminal)
cd frontend
npm start
```

### 4.2 Test Login
1. Go to `http://localhost:3000`
2. Click "Sign in with College Email"
3. Use a `@rajalakshmi.edu.in` email address
4. Verify you can access the dashboard

## 🔒 Security Features

### Domain Validation
- Only `@rajalakshmi.edu.in` email addresses are allowed
- Frontend and backend both validate email domains
- Unauthorized domains are rejected with clear error messages

### Role-Based Access
- Only users with "Portal Admin" role can access the system
- JWT tokens are used for session management
- Tokens expire after 24 hours

## 🚀 Production Deployment

### Azure App Services
1. Create two App Services:
   - Frontend: React app
   - Backend: Node.js app
2. Update redirect URIs in Azure AD
3. Set environment variables in App Services
4. Configure custom domain if needed

### Environment Variables for Production
Update the redirect URIs in Azure AD to include your production URLs:
- `https://your-frontend-app.azurewebsites.net`
- `https://your-backend-app.azurewebsites.net`

## 🆘 Troubleshooting

### Common Issues
1. **"Access denied" error**: Check if user email ends with `@rajalakshmi.edu.in`
2. **"User not authorized"**: Ensure user exists in database with "Portal Admin" role
3. **Token errors**: Verify JWT_SECRET is set in backend environment
4. **CORS errors**: Check if frontend URL is added to Azure AD redirect URIs

### Debug Steps
1. Check browser console for errors
2. Verify environment variables are loaded
3. Check Azure AD app registration configuration
4. Verify database connection and user data

## 📞 Support
If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are correctly set
3. Ensure the user exists in the database with the correct role
4. Check Azure AD app registration settings
