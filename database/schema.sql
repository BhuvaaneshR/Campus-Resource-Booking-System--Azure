-- Campus Resource Booking System Database Schema
-- SQL Server Database

-- Create database (run this separately if needed)
-- CREATE DATABASE campusbookingdb;

USE campusbookingdb;

-- Users table for authentication and role management
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    name NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL CHECK (role IN ('Portal Admin', 'Academic Faculty', 'Placement Faculty', 'Student Coordinator')),
    isActive BIT DEFAULT 1,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);

-- Resources table for campus facilities
CREATE TABLE Resources (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    type NVARCHAR(100) NOT NULL, -- e.g., 'Auditorium', 'Conference Room', 'Lab', 'Sports Facility'
    location NVARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    description NVARCHAR(MAX),
    isActive BIT DEFAULT 1,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);

-- Bookings table for resource reservations
CREATE TABLE Bookings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    eventName NVARCHAR(255) NOT NULL,
    resourceId INT NOT NULL,
    startDateTime DATETIME2 NOT NULL,
    endDateTime DATETIME2 NOT NULL,
    activityType NVARCHAR(100), -- e.g., 'Academic', 'Placement', 'Club Event', 'Meeting'
    participantCount INT,
    inchargeName NVARCHAR(255) NOT NULL,
    inchargeEmail NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Completed')),
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (resourceId) REFERENCES Resources(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IX_Bookings_ResourceId ON Bookings(resourceId);
CREATE INDEX IX_Bookings_StartDateTime ON Bookings(startDateTime);
CREATE INDEX IX_Bookings_EndDateTime ON Bookings(endDateTime);
CREATE INDEX IX_Bookings_Status ON Bookings(status);
CREATE INDEX IX_Users_Email ON Users(email);
CREATE INDEX IX_Users_Role ON Users(role);

-- Insert sample data
-- Sample Users (Portal Admins)
INSERT INTO Users (email, name, role) VALUES
('admin1@university.edu', 'John Smith', 'Portal Admin'),
('admin2@university.edu', 'Sarah Johnson', 'Portal Admin');

-- Sample Resources
INSERT INTO Resources (name, type, location, capacity, description) VALUES
('Main Auditorium', 'Auditorium', 'Building A, Ground Floor', 500, 'Large auditorium with stage, sound system, and projector'),
('Conference Room 1', 'Conference Room', 'Building B, 2nd Floor', 20, 'Medium conference room with whiteboard and video conferencing'),
('Conference Room 2', 'Conference Room', 'Building B, 2nd Floor', 15, 'Small conference room for meetings'),
('Computer Lab 1', 'Laboratory', 'Building C, 1st Floor', 30, 'Computer lab with 30 workstations'),
('Sports Hall', 'Sports Facility', 'Sports Complex', 100, 'Indoor sports hall for basketball, badminton, and other activities'),
('Library Seminar Room', 'Seminar Room', 'Library, 3rd Floor', 50, 'Quiet seminar room with presentation facilities'),
('Placement Cell Office', 'Office', 'Building D, 1st Floor', 10, 'Placement cell office for interviews and meetings'),
('Cafeteria Hall', 'Hall', 'Building E, Ground Floor', 200, 'Large hall suitable for events and gatherings');

-- Sample Bookings
INSERT INTO Bookings (eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail, status) VALUES
('Annual Tech Conference', 1, '2024-02-15 09:00:00', '2024-02-15 17:00:00', 'Academic', 300, 'Dr. Michael Brown', 'michael.brown@university.edu', 'Confirmed'),
('Placement Drive - Tech Corp', 7, '2024-02-20 10:00:00', '2024-02-20 16:00:00', 'Placement', 50, 'Ms. Lisa Wilson', 'lisa.wilson@university.edu', 'Confirmed'),
('Student Club Meeting', 2, '2024-02-18 14:00:00', '2024-02-18 16:00:00', 'Club Event', 15, 'Alex Kumar', 'alex.kumar@university.edu', 'Confirmed'),
('Research Presentation', 6, '2024-02-22 11:00:00', '2024-02-22 12:30:00', 'Academic', 25, 'Dr. Emily Davis', 'emily.davis@university.edu', 'Pending');

-- Create a view for booking details with resource information
CREATE VIEW BookingDetails AS
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
INNER JOIN Resources r ON b.resourceId = r.id;

-- Create stored procedure for checking resource availability
CREATE PROCEDURE CheckResourceAvailability
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
    AND b.status = 'Confirmed'
    AND (
        (b.startDateTime < @EndDateTime AND b.endDateTime > @StartDateTime)
    );
END;
