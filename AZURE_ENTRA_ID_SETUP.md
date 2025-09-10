# Microsoft Entra ID Setup with RBAC

## Overview
This document provides step-by-step instructions to set up Microsoft Entra ID authentication with Role-Based Access Control (RBAC) for the Campus Resource Booking System. The system supports three personas:

1. **Portal Admin** - Full system access and management
2. **Faculty** - Resource booking and management for their department
3. **Student Coordinator** - Limited booking access for student activities

## Prerequisites
- Azure subscription with Entra ID (Azure AD) access
- Administrator privileges in your Entra ID tenant
- @rajalakshmi.edu.in domain configured in Entra ID

## Step 1: Create Azure App Registration

1. Go to the [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure the application:
   - **Name**: `Campus Resource Booking System`
   - **Supported account types**: `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI**: 
     - Type: `Single-page application (SPA)`
     - URI: `http://localhost:3000` (for development)
5. Click **Register**

## Step 2: Configure Authentication

1. In your app registration, go to **Authentication**
2. Under **Single-page application**, add redirect URIs:
   - `http://localhost:3000` (development)
   - `https://your-production-domain.azurewebsites.net` (production)
3. Under **Implicit grant and hybrid flows**, enable:
   - ✅ **Access tokens**
   - ✅ **ID tokens**
4. Under **Advanced settings**:
   - Set **Allow public client flows** to **Yes**
5. Save the configuration

## Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add the following permissions:
   - `User.Read` (to read user profile)
   - `Directory.Read.All` (to read user roles and group memberships)
   - `AppRoleAssignment.ReadWrite.All` (for role management)
6. Click **Add permissions**
7. Click **Grant admin consent** for your organization

## Step 4: Create Application Roles

1. Go to **App roles**
2. Click **Create app role**
3. Create the following three roles:

### Portal Admin Role
```
Display name: Portal Admin
Description: Full administrative access to the campus resource booking system
Allowed member types: Users/Groups
Value: PortalAdmin
```

### Faculty Role
```
Display name: Faculty
Description: Faculty members can manage bookings for their department
Allowed member types: Users/Groups
Value: Faculty
```

### Student Coordinator Role
```
Display name: Student Coordinator
Description: Student coordinators can manage bookings for student activities
Allowed member types: Users/Groups
Value: StudentCoordinator
```

4. Save each role

## Step 5: Create Client Secret (for Backend)

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `Campus Booking System Backend`
4. Set expiration: `24 months` (or as per your policy)
5. Click **Add**
6. **Important**: Copy the secret value immediately - you won't be able to see it again

## Step 6: Assign Users to Roles

1. Go to **Azure Active Directory** > **Enterprise applications**
2. Find your "Campus Resource Booking System" application
3. Go to **Users and groups**
4. Click **Add user/group**
5. Select users and assign appropriate roles:
   - **Portal Admin**: IT administrators, system administrators
   - **Faculty**: Teaching faculty, department heads
   - **Student Coordinator**: Student representatives, activity coordinators

## Step 7: Configure Environment Variables

### Backend (.env file)
Create `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Microsoft Entra ID Configuration
AZURE_CLIENT_ID=your-application-client-id
AZURE_CLIENT_SECRET=your-client-secret-value
AZURE_TENANT_ID=your-tenant-id
AZURE_REDIRECT_URI=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Database Configuration (SQL Server)
DB_SERVER=your-database-server
DB_DATABASE=CampusBookingSystem
DB_USERNAME=your-database-username
DB_PASSWORD=your-database-password
DB_ENCRYPT=true

# Azure Services Configuration
AZURE_APP_SERVICE_URL=your-azure-app-service-url
AZURE_KEY_VAULT_URL=your-key-vault-url

# Allowed Email Domains
ALLOWED_DOMAINS=rajalakshmi.edu.in
```

### Frontend (.env file)
Create `.env` file in the `frontend` directory:

```env
# Microsoft Entra ID Configuration
REACT_APP_AZURE_CLIENT_ID=your-application-client-id
REACT_APP_AZURE_TENANT_ID=your-tenant-id
REACT_APP_REDIRECT_URI=http://localhost:3000

# Backend API Configuration
REACT_APP_API_URL=http://localhost:5001/api

# App Configuration
REACT_APP_APP_NAME=Campus Resource Booking System
REACT_APP_ALLOWED_DOMAIN=rajalakshmi.edu.in
```

## Step 8: Database Setup

Ensure your SQL Server database has the correct Users table schema:

```sql
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL CHECK (role IN ('Portal Admin', 'Faculty', 'Student Coordinator')),
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);

-- Create indexes for performance
CREATE INDEX IX_Users_Email ON Users(email);
CREATE INDEX IX_Users_Role ON Users(role);
```

## Step 9: Test the Setup

### Development Testing
1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend server:
   ```bash
   cd frontend
   npm start
   ```

3. Navigate to `http://localhost:3000`
4. Click "Sign in with Microsoft"
5. Sign in with different user accounts to test role assignments

### Role-Based Access Testing
Test with users assigned different roles:
- **Portal Admin**: Should have access to all features
- **Faculty**: Should have access to department-specific features
- **Student Coordinator**: Should have limited booking capabilities

## Step 10: Azure App Service Deployment

### Backend Deployment
1. Create an Azure App Service (Linux, Node.js 18 LTS)
2. Configure environment variables in App Service Configuration:
   - All the variables from your `.env` file
   - Update `AZURE_REDIRECT_URI` to your production URL
3. Deploy your backend code

### Frontend Deployment
1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy to Azure Static Web Apps or App Service
3. Update redirect URIs in Azure App Registration

## Step 11: Production Security Configuration

1. **Update Redirect URIs** in App Registration:
   - Remove localhost URLs
   - Add production URLs only

2. **Configure Conditional Access** (if available):
   - Require MFA for Portal Admin roles
   - Restrict access to campus IP ranges
   - Set up device compliance requirements

3. **Enable Audit Logs**:
   - Monitor sign-in activities
   - Track role assignments and changes
   - Set up alerts for suspicious activities

## RBAC Implementation Details

### Role Hierarchy and Permissions

#### Portal Admin
- **Full Access**: All resources, all operations
- **User Management**: Can view and manage all users
- **System Configuration**: Can modify system settings
- **Reporting**: Access to all reports and analytics

#### Faculty
- **Department Resources**: Can book and manage department resources
- **Student Supervision**: Can approve student coordinator requests
- **Reporting**: Access to department-specific reports
- **Profile Management**: Can update their own profile

#### Student Coordinator  
- **Limited Booking**: Can book resources for student activities
- **Event Management**: Can manage student events and activities
- **Basic Reporting**: Access to their own booking history
- **Profile Management**: Can update their own profile

### Role Assignment Flow

1. **Automatic Role Detection**: System checks Entra ID app role assignments
2. **Database Sync**: Updates local database with user roles
3. **Fallback**: If no Entra ID role, assigns default "Student Coordinator" role
4. **Dynamic Updates**: Roles update on next login when changed in Entra ID

## Troubleshooting

### Common Issues

1. **"Access Denied" errors**
   - Verify user email domain (@rajalakshmi.edu.in)
   - Check if user is assigned to an app role
   - Ensure user exists in database

2. **"Invalid client_id" errors**
   - Verify REACT_APP_AZURE_CLIENT_ID matches App Registration
   - Check environment variables are loaded correctly

3. **Role not updating**
   - User needs to sign out and sign in again
   - Check app role assignments in Enterprise Application
   - Verify API permissions are granted

4. **Database connection issues**
   - Check connection string and credentials
   - Ensure SQL Server allows Azure connections
   - Verify firewall rules

### Monitoring and Maintenance

1. **Regular Audits**:
   - Review user role assignments quarterly
   - Monitor inactive users and deactivate accounts
   - Check for users who should have role changes

2. **Security Updates**:
   - Keep Entra ID app registration current
   - Rotate client secrets annually
   - Update API permissions as needed

3. **Performance Monitoring**:
   - Monitor authentication response times
   - Track failed login attempts
   - Monitor database performance

## Support and Resources

- [Microsoft Entra ID Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)

This setup provides a secure, scalable authentication system with proper role-based access control for your campus resource booking system, fully integrated with Azure services.
