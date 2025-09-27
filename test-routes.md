# 🧪 Route Testing Guide

## Quick Access URLs for Testing

### Main Application
- **Root**: http://localhost:3000/
- **Login**: http://localhost:3000/login

### Faculty Routes (NEW)
- **Faculty Dashboard**: http://localhost:3000/faculty/dashboard
- **New Booking Request**: http://localhost:3000/faculty/booking-request  
- **My Bookings**: http://localhost:3000/faculty/my-bookings

### Admin Routes (Existing)
- **Admin Dashboard**: http://localhost:3000/admin/dashboard
- **Admin Booking**: http://localhost:3000/admin/booking
- **Admin Management**: http://localhost:3000/admin/management

### Backend Health Check
- **API Health**: http://localhost:5001/health

## Role Testing
Use the Role Switcher (visible in development mode) to test different user personas:
1. Switch to "Faculty" → Should redirect to `/faculty/dashboard`
2. Switch to "Placement Executive" → Should see urgent booking option
3. Switch to "Portal Admin" → Should redirect to `/admin/dashboard`

## Import Verification Status
✅ All components properly imported  
✅ Routing correctly configured  
✅ No compilation errors  
✅ Build successful with only minor linting warnings  
✅ Applications running on correct ports
