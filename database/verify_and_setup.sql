-- Database Verification and Setup Script
-- Run this in your SSMS to verify and complete the database setup

USE campusbookingdb;

-- Check if tables exist and their structure
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME IN ('Users', 'Resources', 'Bookings')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- Check if indexes exist
SELECT 
    i.name AS IndexName,
    t.name AS TableName,
    c.name AS ColumnName
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE t.name IN ('Users', 'Resources', 'Bookings')
ORDER BY t.name, i.name;

-- Create missing indexes if they don't exist
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Bookings_ResourceId')
    CREATE INDEX IX_Bookings_ResourceId ON Bookings(resourceId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Bookings_StartDateTime')
    CREATE INDEX IX_Bookings_StartDateTime ON Bookings(startDateTime);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Bookings_EndDateTime')
    CREATE INDEX IX_Bookings_EndDateTime ON Bookings(endDateTime);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Bookings_Status')
    CREATE INDEX IX_Bookings_Status ON Bookings(status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Email')
    CREATE INDEX IX_Users_Email ON Users(email);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Role')
    CREATE INDEX IX_Users_Role ON Users(role);

-- Create BookingDetails view if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'BookingDetails')
BEGIN
    EXEC('CREATE VIEW BookingDetails AS
    SELECT 
        b.id,
        b.eventName,
        b.startDateTime,
        b.endDateTime,
        b.activityType,
        b.participantCount,
        b.inchargeName,
        b.inchargeEmail,
        b.status,
        b.createdAt,
        b.updatedAt,
        r.name as resourceName,
        r.type as resourceType,
        r.location,
        r.capacity
    FROM Bookings b
    INNER JOIN Resources r ON b.resourceId = r.id');
END

-- Create stored procedure for checking resource availability if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.procedures WHERE name = 'CheckResourceAvailability')
BEGIN
    EXEC('CREATE PROCEDURE CheckResourceAvailability
        @ResourceId INT,
        @StartDateTime DATETIME2,
        @EndDateTime DATETIME2
    AS
    BEGIN
        SELECT 
            b.id,
            b.eventName,
            b.startDateTime,
            b.endDateTime,
            b.status
        FROM Bookings b
        WHERE b.resourceId = @ResourceId
        AND b.status = ''Confirmed''
        AND (
            (b.startDateTime < @EndDateTime AND b.endDateTime > @StartDateTime)
        );
    END');
END

-- Check if sample data exists
SELECT 'Users' as TableName, COUNT(*) as RecordCount FROM Users
UNION ALL
SELECT 'Resources' as TableName, COUNT(*) as RecordCount FROM Resources
UNION ALL
SELECT 'Bookings' as TableName, COUNT(*) as RecordCount FROM Bookings;

-- Insert sample resources if table is empty
IF NOT EXISTS (SELECT 1 FROM Resources)
BEGIN
    INSERT INTO Resources (name, type, location, capacity, description) VALUES
    ('Main Auditorium', 'Auditorium', 'Building A, Ground Floor', 500, 'Large auditorium with stage, sound system, and projector'),
    ('Conference Room 1', 'Conference Room', 'Building B, 2nd Floor', 20, 'Medium conference room with whiteboard and video conferencing'),
    ('Conference Room 2', 'Conference Room', 'Building B, 2nd Floor', 15, 'Small conference room for meetings'),
    ('Computer Lab 1', 'Laboratory', 'Building C, 1st Floor', 30, 'Computer lab with 30 workstations'),
    ('Sports Hall', 'Sports Facility', 'Sports Complex', 100, 'Indoor sports hall for basketball, badminton, and other activities'),
    ('Library Seminar Room', 'Seminar Room', 'Library, 3rd Floor', 50, 'Quiet seminar room with presentation facilities'),
    ('Placement Cell Office', 'Office', 'Building D, 1st Floor', 10, 'Placement cell office for interviews and meetings'),
    ('Cafeteria Hall', 'Hall', 'Building E, Ground Floor', 200, 'Large hall suitable for events and gatherings');
    
    PRINT 'Sample resources inserted successfully.';
END
ELSE
BEGIN
    PRINT 'Resources table already contains data.';
END

-- Insert sample users if table is empty
IF NOT EXISTS (SELECT 1 FROM Users)
BEGIN
    INSERT INTO Users (email, name, role) VALUES
    ('admin@rajalakshmi.edu.in', 'System Administrator', 'Portal Admin'),
    ('faculty1@rajalakshmi.edu.in', 'Dr. John Smith', 'Academic Faculty'),
    ('placement@rajalakshmi.edu.in', 'Ms. Sarah Johnson', 'Placement Faculty'),
    ('student.coord@rajalakshmi.edu.in', 'Alex Kumar', 'Student Coordinator');
    
    PRINT 'Sample users inserted successfully.';
END
ELSE
BEGIN
    PRINT 'Users table already contains data.';
END

PRINT 'Database verification and setup completed successfully!';
