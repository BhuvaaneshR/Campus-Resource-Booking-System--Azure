-- Campus Resource Booking System - Faculty Feature Updates
-- SQL Server Database Schema Updates

USE campusbookingdb;

-- Add new columns to Bookings table for faculty functionality
BEGIN TRANSACTION;

-- Add description field for event details
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Bookings' AND COLUMN_NAME = 'description')
BEGIN
    ALTER TABLE Bookings 
    ADD description NVARCHAR(MAX) NULL;
END

-- Add contact phone field
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Bookings' AND COLUMN_NAME = 'contactPhone')
BEGIN
    ALTER TABLE Bookings 
    ADD contactPhone NVARCHAR(20) NULL;
END

-- Add urgent booking flag for placement executives
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Bookings' AND COLUMN_NAME = 'isUrgent')
BEGIN
    ALTER TABLE Bookings 
    ADD isUrgent BIT DEFAULT 0;
END

-- Add rejection reason field for approval workflow
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Bookings' AND COLUMN_NAME = 'rejectionReason')
BEGIN
    ALTER TABLE Bookings 
    ADD rejectionReason NVARCHAR(MAX) NULL;
END

-- Add approved by field to track who approved the booking
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Bookings' AND COLUMN_NAME = 'approvedBy')
BEGIN
    ALTER TABLE Bookings 
    ADD approvedBy NVARCHAR(255) NULL;
END

-- Update status field constraints to include faculty workflow statuses
BEGIN TRY
    ALTER TABLE Bookings DROP CONSTRAINT CK__Bookings__status__*;
EXCEPTION
    WHEN OTHERS THEN NULL;
END TRY

ALTER TABLE Bookings 
ADD CONSTRAINT CK_Bookings_Status 
CHECK (status IN ('Pending Approval', 'Confirmed', 'Rejected', 'Cancelled', 'Cancelled - Overridden', 'Completed'));

-- Update user roles to include Faculty and Placement Executive
BEGIN TRY
    ALTER TABLE Users DROP CONSTRAINT CK__Users__role__*;
EXCEPTION
    WHEN OTHERS THEN NULL;
END TRY

ALTER TABLE Users 
ADD CONSTRAINT CK_Users_Role 
CHECK (role IN ('Portal Admin', 'Faculty', 'Placement Executive', 'Student Coordinator'));

-- Create index for better performance on new fields
CREATE INDEX IX_Bookings_IsUrgent ON Bookings(isUrgent);
CREATE INDEX IX_Bookings_InchargeEmail ON Bookings(inchargeEmail);

COMMIT TRANSACTION;

-- Update sample data to include Faculty users
INSERT INTO Users (email, name, role) VALUES
('prof.smith@rajalakshmi.edu.in', 'Prof. John Smith', 'Faculty'),
('prof.wilson@rajalakshmi.edu.in', 'Prof. Sarah Wilson', 'Faculty'),
('placement.head@rajalakshmi.edu.in', 'Mr. Rajesh Kumar', 'Placement Executive'),
('coordinator@rajalakshmi.edu.in', 'Ms. Priya Sharma', 'Student Coordinator');

-- Insert sample faculty booking requests
INSERT INTO Bookings (
    eventName, 
    resourceId, 
    startDateTime, 
    endDateTime, 
    activityType, 
    participantCount, 
    inchargeName, 
    inchargeEmail, 
    contactPhone,
    description,
    status, 
    isUrgent
) VALUES
('Machine Learning Workshop', 4, '2024-03-15 10:00:00', '2024-03-15 16:00:00', 'Academic', 25, 'Prof. John Smith', 'prof.smith@rajalakshmi.edu.in', '+91-9876543210', 'Hands-on workshop on machine learning algorithms for final year students', 'Pending Approval', 0),
('Company Placement Drive - TechCorp', 1, '2024-03-20 09:00:00', '2024-03-20 17:00:00', 'Placement Activity', 200, 'Mr. Rajesh Kumar', 'placement.head@rajalakshmi.edu.in', '+91-8765432109', 'Urgent placement drive for TechCorp - multiple rounds of interviews', 'Confirmed', 1),
('Research Paper Presentation', 6, '2024-03-18 14:00:00', '2024-03-18 16:00:00', 'Academic', 30, 'Prof. Sarah Wilson', 'prof.wilson@rajalakshmi.edu.in', '+91-7654321098', 'Final year project presentations and evaluation', 'Confirmed', 0);

-- Create view for faculty dashboard data
CREATE VIEW FacultyDashboardView AS
SELECT 
    b.id,
    b.eventName,
    b.startDateTime,
    b.endDateTime,
    b.status,
    b.isUrgent,
    b.inchargeName,
    b.inchargeEmail,
    r.name as resourceName,
    r.type as resourceType,
    r.location,
    r.capacity
FROM Bookings b
INNER JOIN Resources r ON b.resourceId = r.id
WHERE b.status = 'Confirmed'
AND b.startDateTime >= CAST(GETDATE() AS DATE); -- Only future bookings

-- Create stored procedure for priority booking conflict resolution
CREATE PROCEDURE HandlePriorityBookingConflicts
    @ResourceId INT,
    @StartDateTime DATETIME2,
    @EndDateTime DATETIME2,
    @PlacementExecutiveEmail NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ConflictCount INT = 0;
    
    -- Count conflicting bookings
    SELECT @ConflictCount = COUNT(*)
    FROM Bookings
    WHERE resourceId = @ResourceId
    AND status IN ('Confirmed', 'Pending Approval')
    AND (startDateTime < @EndDateTime AND endDateTime > @StartDateTime);
    
    -- Update conflicting bookings to overridden status
    IF @ConflictCount > 0
    BEGIN
        UPDATE Bookings 
        SET status = 'Cancelled - Overridden',
            updatedAt = GETDATE()
        WHERE resourceId = @ResourceId
        AND status IN ('Confirmed', 'Pending Approval')
        AND (startDateTime < @EndDateTime AND endDateTime > @StartDateTime);
        
        -- Log the conflict resolution (you might want to add a conflicts log table)
        PRINT 'Priority booking override: ' + CAST(@ConflictCount AS NVARCHAR) + ' bookings cancelled';
    END
    
    RETURN @ConflictCount;
END;

-- Grant necessary permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON Bookings TO [faculty_user_role];
-- GRANT SELECT ON Resources TO [faculty_user_role];
-- GRANT EXECUTE ON HandlePriorityBookingConflicts TO [placement_executive_role];

PRINT 'Faculty schema updates completed successfully!';
