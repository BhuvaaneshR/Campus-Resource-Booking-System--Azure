-- Campus Resource Booking System - Club Column Migration
-- SQL Server Database Schema Update for Club Support

USE campusbookingdb;

BEGIN TRANSACTION;

-- Add club column to Users table if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'club')
BEGIN
    ALTER TABLE Users 
    ADD club NVARCHAR(200) NULL;
    PRINT 'Added club column to Users table';
END
ELSE
BEGIN
    PRINT 'Club column already exists in Users table';
END

-- Add subject column to Users table if it doesn't exist (for future faculty subjects)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'subject')
BEGIN
    ALTER TABLE Users 
    ADD subject NVARCHAR(200) NULL;
    PRINT 'Added subject column to Users table';
END
ELSE
BEGIN
    PRINT 'Subject column already exists in Users table';
END

-- Add department column to Users table if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'department')
BEGIN
    ALTER TABLE Users 
    ADD department NVARCHAR(200) NULL;
    PRINT 'Added department column to Users table';
END
ELSE
BEGIN
    PRINT 'Department column already exists in Users table';
END

-- Update the role constraint to match the current system
BEGIN TRY
    -- Drop existing constraint if it exists
    DECLARE @ConstraintName NVARCHAR(200)
    SELECT @ConstraintName = name FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('Users') AND definition LIKE '%role%'
    
    IF @ConstraintName IS NOT NULL
    BEGIN
        DECLARE @SQL NVARCHAR(MAX) = 'ALTER TABLE Users DROP CONSTRAINT ' + QUOTENAME(@ConstraintName)
        EXEC sp_executesql @SQL
        PRINT 'Dropped existing role constraint: ' + @ConstraintName
    END
END TRY
BEGIN CATCH
    PRINT 'No existing role constraint found or error dropping constraint'
END CATCH

-- Add updated role constraint
ALTER TABLE Users 
ADD CONSTRAINT CK_Users_Role_Updated
CHECK (role IN ('Portal Admin', 'Faculty', 'Student Coordinator', 'Academic Faculty', 'Placement Faculty', 'Placement Executive'));

PRINT 'Added updated role constraint to Users table';

-- Create index on club column for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Club')
BEGIN
    CREATE INDEX IX_Users_Club ON Users(club);
    PRINT 'Created index on club column';
END

-- Verify the ProfileRequests table has club support (should be auto-created by backend)
PRINT 'Verifying ProfileRequests table structure...';
IF EXISTS (SELECT * FROM sysobjects WHERE name='ProfileRequests' AND xtype='U')
BEGIN
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProfileRequests' AND COLUMN_NAME = 'club')
        PRINT 'ProfileRequests table already has club column - OK';
    ELSE
        PRINT 'WARNING: ProfileRequests table exists but missing club column. Backend will add it automatically.';
END
ELSE
BEGIN
    PRINT 'ProfileRequests table does not exist yet. Backend will create it with club support automatically.';
END

COMMIT TRANSACTION;

PRINT 'Club column migration completed successfully!';
PRINT '';
PRINT 'Summary of changes:';
PRINT '- Added club column to Users table (if not exists)';  
PRINT '- Added subject column to Users table (if not exists)';
PRINT '- Added department column to Users table (if not exists)';
PRINT '- Updated role constraint to include current roles';
PRINT '- Created index on club column for performance';
PRINT '';
PRINT 'The system now fully supports club selection for Student Coordinator role!';
