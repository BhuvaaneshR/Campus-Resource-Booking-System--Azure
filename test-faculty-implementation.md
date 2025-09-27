# Faculty Persona Implementation Test Guide

## Overview
This guide outlines how to test the newly implemented Faculty persona for the Campus Resource Booking System.

## Components Implemented

### Frontend Components
1. **FacultyLayout.tsx** - Layout component for faculty users with navigation
2. **FacultyDashboard.tsx** - Main dashboard showing campus-wide calendar
3. **BookingRequestForm.tsx** - Form for submitting booking requests
4. **MyBookings.tsx** - Page showing user's booking requests and status

### Backend API Endpoints
1. `GET /api/bookings` - Get all confirmed bookings (calendar view)
2. `GET /api/bookings/my-requests` - Get current user's booking requests
3. `POST /api/bookings/requests` - Submit new booking request (Pending Approval)
4. `POST /api/bookings/priority-booking` - Priority booking for Placement Executives
5. `GET /api/bookings/user/role` - Get current user's role

### Key Features
- **Role-based routing** - Automatic redirection based on user role
- **Calendar view** - Shows all confirmed campus bookings
- **Request workflow** - Faculty submit requests for admin approval
- **Priority bookings** - Placement Executives can override lower-priority events
- **My Bookings management** - View, edit, cancel personal requests

## Testing Steps

### 1. Database Setup
```sql
-- Run the faculty schema updates
-- File: database/faculty_schema_updates.sql
```

### 2. User Role Testing
Test with different user roles:
- **Faculty** → Should redirect to `/faculty/dashboard`
- **Placement Executive** → Should redirect to `/faculty/dashboard` (with urgent booking option)
- **Portal Admin** → Should redirect to `/admin/dashboard`

### 3. Faculty Dashboard Testing
- View should show confirmed campus bookings
- Filter by resource should work
- Search functionality should filter events/resources
- Today/Week view toggle should work

### 4. Booking Request Form Testing
**For Regular Faculty:**
- Should NOT see "Urgent Booking" checkbox
- Form submission should create booking with "Pending Approval" status
- Should validate required fields
- Should check for resource capacity limits

**For Placement Executives:**
- Should see "Urgent Booking" checkbox
- Urgent bookings should be immediately confirmed
- Should be able to override existing bookings

### 5. My Bookings Testing
- Should show only current user's bookings
- Status filtering should work
- Should be able to view booking details
- Should be able to cancel pending/confirmed bookings
- Should be able to edit pending bookings

## Mock Data for Testing

### Test Users (Add to database)
```sql
INSERT INTO Users (email, name, role) VALUES
('faculty1@rajalakshmi.edu.in', 'Dr. John Faculty', 'Faculty'),
('placement@rajalakshmi.edu.in', 'Ms. Placement Executive', 'Placement Executive'),
('admin@rajalakshmi.edu.in', 'Mr. Portal Admin', 'Portal Admin');
```

### Test Resources (Should already exist)
- Main Auditorium
- Conference Rooms
- Computer Labs
- Sports Hall

## Expected Behaviors

### Navigation Flow
1. Login → Role detection → Appropriate dashboard redirect
2. Faculty users see faculty navigation menu
3. Placement Executives see additional "Urgent Booking" options

### Booking Workflow
1. Faculty submits request → Status: "Pending Approval"
2. Admin reviews and approves → Status: "Confirmed" 
3. Placement Executive urgent booking → Status: "Confirmed" (immediate)

### Error Handling
- Proper validation messages for forms
- Conflict detection for resource bookings
- Authentication required for protected routes
- Role-based access control

## Potential Issues to Check
1. Date/time format consistency between frontend and backend
2. Timezone handling for bookings
3. Resource capacity validation
4. Conflict resolution for priority bookings
5. Proper error messages and user feedback

## Success Criteria
✅ Role-based routing works correctly  
✅ Faculty can view campus calendar  
✅ Faculty can submit booking requests  
✅ Placement Executives can create priority bookings  
✅ My Bookings page shows user's requests  
✅ Status updates and workflow function properly  
✅ All forms validate correctly  
✅ Error handling provides clear feedback  

## Next Steps
Once testing is complete:
1. Create Azure Logic Apps for approval workflows
2. Set up email notifications for booking status changes
3. Implement additional faculty-specific features as needed
4. Add comprehensive error logging and monitoring
