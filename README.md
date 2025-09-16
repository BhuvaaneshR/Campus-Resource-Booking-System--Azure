# Campus Resource Booking System - Azure Integration

A comprehensive campus resource booking system built with React.js, Node.js, and SQL Server, deployed on Azure App Services with Microsoft Entra ID integration.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React.js with TypeScript, Material-UI
- **Backend**: Node.js with Express.js, TypeScript
- **Database**: SQL Server Management System
- **Cloud Platform**: Microsoft Azure
- **Deployment**: Azure App Services
- **Authentication**: Microsoft Entra ID (Azure AD)
- **Automation**: Azure Logic Apps

### User Personas
1. **Portal Admin** - System administrators with full access
2. **Faculty** - Academic and Placement faculty members
3. **Club/Society Student Coordinators** - Student representatives

## 🚀 Features

### Portal Admin Features
- **Microsoft Entra ID SSO Authentication**
- **Interactive Dashboard** with calendar view
- **Resource Booking Management**
- **Comprehensive Booking Form** with validation
- **Booking Management** with search and filtering
- **Real-time Calendar Integration**

## 📁 Project Structure

```
Campus-Resource-Booking-System--Azure/
├── frontend/                 # React.js frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── services/       # API services
│   │   └── config/         # Configuration files
│   └── package.json
├── backend/                 # Node.js backend API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── config/         # Database and app config
│   │   └── server.ts       # Main server file
│   └── package.json
├── database/               # Database schema and scripts
│   └── schema.sql         # SQL Server database schema
├── azure-deploy.yml       # Azure deployment pipeline
├── azure-logic-apps.json  # Logic Apps automation
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18.x or higher
- SQL Server (Azure SQL Database recommended)
- Azure subscription
- Microsoft Entra ID tenant

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Azure SQL Database Configuration
DB_SERVER=your-sql-server.database.windows.net
DB_NAME=campus_booking_db
DB_USER=your-username
DB_PASSWORD=your-password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# Microsoft Entra ID Configuration
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
AZURE_REDIRECT_URI=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:
```env
# Azure Configuration
REACT_APP_AZURE_CLIENT_ID=your-client-id
REACT_APP_AZURE_TENANT_ID=your-tenant-id
REACT_APP_REDIRECT_URI=http://localhost:3000

# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Database Setup

1. Create Azure SQL Database
2. Run the SQL script from `database/schema.sql`
3. Update database connection string in backend `.env`

### 4. Microsoft Entra ID Setup

1. Register a new application in Azure Portal
2. Configure redirect URIs
3. Add API permissions (User.Read)
4. Create client secret
5. Update configuration in both frontend and backend `.env` files

## 🚀 Running the Application

### Development Mode

```bash
# Start backend server
cd backend
npm run dev

# Start frontend (in new terminal)
cd frontend
npm start
```

### Production Deployment

1. **Azure App Services Setup**:
   - Create two App Services (frontend and backend)
   - Configure deployment from GitHub
   - Set environment variables

2. **Database Setup**:
   - Create Azure SQL Database
   - Run schema.sql script
   - Configure connection strings

3. **Logic Apps Setup**:
   - Import `azure-logic-apps.json`
   - Configure connections
   - Set up triggers for booking notifications

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - Microsoft Entra ID login
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - Logout

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking

### Resources
- `GET /api/resources` - Get all resources
- `GET /api/resources/:id` - Get resource by ID
- `GET /api/resources/search/:query` - Search resources
- `GET /api/resources/:id/availability` - Check availability

## 🔐 Security Features

- Microsoft Entra ID Single Sign-On (SSO)
- JWT token-based authentication
- Role-based access control
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers

## 🤖 Automation with Azure Logic Apps

The system includes automated workflows:

1. **Booking Confirmation Emails** - Sent when new bookings are created
2. **Booking Reminders** - Daily reminders for upcoming bookings
3. **Resource Conflict Notifications** - Alerts for scheduling conflicts

## 📱 User Interface

### Portal Admin Dashboard
- **Home Page**: Interactive calendar with booking overview
- **Booking Form**: Comprehensive form with resource selection
- **Management Page**: Searchable and filterable booking list
- **Navigation**: Persistent header with search and user profile

### Key UI Components
- Material-UI design system
- Responsive layout
- Real-time calendar integration
- Advanced search and filtering
- Form validation and error handling

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
- Database connection settings
- Azure authentication configuration
- JWT secret and expiration
- Server port and environment

#### Frontend (.env)
- Azure client configuration
- API endpoint URLs
- Redirect URIs

## 📊 Database Schema

The system uses SQL Server with the following main tables:
- **Users** - User authentication and roles
- **Resources** - Campus facilities and equipment
- **Bookings** - Resource reservations and scheduling

## 🚀 Deployment

### Azure App Services
- Frontend deployed as static web app
- Backend deployed as Node.js web app
- Automatic CI/CD with GitHub Actions

### Azure Logic Apps
- Automated email notifications
- Booking reminder workflows
- Integration with Office 365

## 📝 License

This project is part of a Cloud Computing course and is for educational purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

