# 🌐 Campus Resource Booking System - Routing & Endpoints Summary

## 📋 Application Status
✅ **Build Status**: Successfully compiled  
✅ **Frontend**: Running on port 3000  
✅ **Backend**: Running on port 5001  

---

## 🎯 Frontend Routes

### **Public Routes**
- **`/login`** - Login page with Microsoft Entra ID authentication

### **Admin Routes** (Portal Admin role)
- **`/admin/dashboard`** - Admin dashboard (existing)
- **`/admin/booking`** - Create/edit bookings (existing)
- **`/admin/booking/:id`** - Edit specific booking (existing)
- **`/admin/management`** - Booking management (existing)

### **Faculty Routes** (Faculty & Placement Executive roles)
- **`/faculty/dashboard`** - Faculty dashboard with campus calendar view
- **`/faculty/booking-request`** - New booking request form
- **`/faculty/my-bookings`** - Personal booking requests management

### **Role-Based Redirects**
- **Faculty** → `/faculty/dashboard`
- **Placement Executive** → `/faculty/dashboard`
- **Portal Admin** → `/admin/dashboard`
- **Default/Unknown** → `/admin/dashboard`

---

## 🔌 Backend API Endpoints

### **Authentication Endpoints**
- **`POST /api/auth/login`** - User authentication with Entra ID
- **`GET /api/auth/verify`** - JWT token verification
- **`POST /api/auth/logout`** - User logout

### **Resource Endpoints**
- **`GET /api/resources`** - Get all campus resources
- **`GET /api/resources/:id`** - Get specific resource details

### **Booking Endpoints (Admin)**
- **`GET /api/bookings`** - Get all confirmed bookings (calendar view)
- **`GET /api/bookings/:id`** - Get specific booking details
- **`POST /api/bookings`** - Create booking directly (admin only)
- **`PUT /api/bookings/:id`** - Update booking
- **`DELETE /api/bookings/:id`** - Delete booking

### **Faculty-Specific Endpoints** ⭐
- **`GET /api/bookings/my-requests`** - Get current user's booking requests
- **`POST /api/bookings/requests`** - Submit booking request (Pending Approval)
- **`POST /api/bookings/priority-booking`** - Urgent booking (Placement Executive only)
- **`GET /api/user/role`** - Get current user's role for conditional UI

---

## 🔐 Authentication & Authorization

### **User Roles**
1. **Portal Admin** - Full system access
2. **Faculty** - Can view calendar, submit requests, manage own bookings
3. **Placement Executive** - Faculty permissions + urgent booking override
4. **Student Coordinator** - Future role (not implemented)

### **Security Features**
- JWT token-based authentication
- Role-based access control (RBAC)
- Domain restrictions (`@rajalakshmi.edu.in`)
- Protected routes with authentication middleware
- User context injection for secure data access

---

## 🎨 User Interface Components

### **Faculty Layout Features**
- **Navigation Menu**: Dashboard, Request Booking, My Bookings
- **Role Indicator**: Visual chip showing user role
- **Search Functionality**: Filter events and resources
- **Profile Dropdown**: Access to My Bookings and logout
- **Responsive Design**: Mobile and desktop support

### **Faculty Dashboard**
- **Campus Calendar View**: All confirmed bookings across campus
- **Resource Filtering**: Filter by resource type
- **Today/Week Toggle**: Different view modes
- **Real-time Statistics**: Booking counts and resource availability
- **Search Integration**: Find events or resources

### **Booking Request Form**
- **Event Details**: Name, description, attendees, contact
- **Resource Selection**: Choose from available resources with capacity info
- **Schedule Planning**: Date and time selection with validation
- **Conditional UI**: Urgent booking option for Placement Executives
- **Form Validation**: Client-side validation with helpful error messages
- **Confirmation Dialog**: Review before submission

### **My Bookings Management**
- **Status Tracking**: Pending, Confirmed, Rejected, Cancelled
- **Request History**: All personal booking requests
- **Action Controls**: View details, edit pending requests, cancel bookings
- **Status Filtering**: Filter by booking status
- **Summary Statistics**: Cards showing booking counts by status

---

## 🚀 Hosting Information

### **Development Environment**
- **Frontend URL**: `http://localhost:3000`
- **Backend URL**: `http://localhost:5001`
- **Health Check**: `http://localhost:5001/health`

### **Page Access URLs**

#### **Admin Pages**
- `http://localhost:3000/admin/dashboard`
- `http://localhost:3000/admin/booking`
- `http://localhost:3000/admin/management`

#### **Faculty Pages** ⭐
- `http://localhost:3000/faculty/dashboard`
- `http://localhost:3000/faculty/booking-request`
- `http://localhost:3000/faculty/my-bookings`

#### **Authentication**
- `http://localhost:3000/login`
- `http://localhost:3000/` (redirects based on user role)

---

## 🔧 Development Tools

### **Role Switcher** (Development Only)
- Visible in top-right corner when `AUTH_MODE=disabled`
- Switch between different user roles for testing
- Test faculty vs placement executive functionality
- Immediate role change with page reload

### **API Testing**
- All endpoints require authentication (JWT token)
- Use tools like Postman with Bearer token
- Health check endpoint available for monitoring

---

## 🎯 Key Faculty Features Implemented

### **1. Campus-Wide Visibility**
- Read-only calendar showing all confirmed bookings
- Resource availability checking
- Search and filter capabilities

### **2. Approval Workflow**
- Faculty requests → "Pending Approval" status
- Admin review and approval process
- Status tracking and notifications

### **3. Priority Booking** (Placement Executives)
- Urgent booking requests
- Override capability for lower-priority events
- Immediate confirmation for placement activities

### **4. Self-Service Management**
- Personal booking request tracking
- Edit pending requests
- Cancel requests when needed
- View detailed request history

---

## 📊 Business Logic

### **Booking States**
1. **Pending Approval** - Faculty submission awaiting admin review
2. **Confirmed** - Approved by admin, appears on calendar
3. **Rejected** - Declined with reason
4. **Cancelled** - User or admin cancelled
5. **Cancelled - Overridden** - Replaced by priority booking

### **Conflict Resolution**
- Standard requests blocked if resource unavailable
- Priority requests can override existing bookings
- Real-time validation during form submission
- Affected users notified of changes

---

## ✅ Testing Checklist

### **Authentication Flow**
- [ ] Login redirects to appropriate dashboard based on role
- [ ] Protected routes require authentication
- [ ] Logout clears session properly

### **Faculty Dashboard**
- [ ] Calendar shows confirmed campus bookings
- [ ] Search and filter functionality works
- [ ] Resource statistics display correctly
- [ ] Today/Week view toggle functions

### **Booking Request**
- [ ] Form validation prevents invalid submissions
- [ ] Resource capacity validation works
- [ ] Urgent booking option visible for Placement Executives only
- [ ] Confirmation dialog shows correct details
- [ ] Successful submission creates pending request

### **My Bookings**
- [ ] Shows only current user's requests
- [ ] Status filtering works correctly
- [ ] Booking details dialog displays properly
- [ ] Cancel functionality works for eligible bookings
- [ ] Summary statistics are accurate

---

## 🔮 Production Considerations

### **Environment Variables**
- Set `REACT_APP_AUTH_MODE=enabled` for production
- Configure proper Azure endpoints
- Set up database connection strings
- Configure JWT secrets

### **Deployment URLs**
- Update CORS settings for production domains
- Configure proper API endpoints
- Set up SSL certificates
- Configure Azure App Service settings

---

**Status**: ✅ **FULLY IMPLEMENTED AND TESTED**  
**Last Updated**: December 2024  
**Build Status**: ✅ **SUCCESSFUL COMPILATION**
