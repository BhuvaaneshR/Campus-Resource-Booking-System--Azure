-- Campus Resource Booking System - Club Support Verification
-- SQL Server Database Schema Verification Script

USE campusbookingdb;

PRINT '=== CLUB SUPPORT VERIFICATION REPORT ===';
PRINT '';

-- Check Users table structure
PRINT '1. USERS TABLE STRUCTURE:';
IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
BEGIN
    PRINT '   ✓ Users table exists';
    
    -- Check for club column
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'club')
        PRINT '   ✓ Club column exists in Users table';
    ELSE
        PRINT '   ✗ Club column MISSING in Users table - MIGRATION NEEDED';
    
    -- Check for department column  
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'department')
        PRINT '   ✓ Department column exists in Users table';
    ELSE
        PRINT '   ✗ Department column MISSING in Users table - MIGRATION NEEDED';
        
    -- Check for subject column
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'subject')
        PRINT '   ✓ Subject column exists in Users table';
    ELSE
        PRINT '   ✗ Subject column MISSING in Users table - MIGRATION NEEDED';
        
    -- Show current columns
    PRINT '   Current Users table columns:';
    SELECT '     - ' + COLUMN_NAME + ' (' + DATA_TYPE + 
           CASE WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
                THEN '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS VARCHAR) + ')' 
                ELSE '' END + 
           CASE WHEN IS_NULLABLE = 'YES' THEN ', NULL' ELSE ', NOT NULL' END + ')' as ColumnInfo
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Users' 
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT '   ✗ Users table does not exist - RUN schema.sql FIRST';
END

PRINT '';

-- Check ProfileRequests table structure
PRINT '2. PROFILEREQUESTS TABLE STRUCTURE:';
IF EXISTS (SELECT * FROM sysobjects WHERE name='ProfileRequests' AND xtype='U')
BEGIN
    PRINT '   ✓ ProfileRequests table exists';
    
    -- Check for club column
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProfileRequests' AND COLUMN_NAME = 'club')
        PRINT '   ✓ Club column exists in ProfileRequests table';
    ELSE
        PRINT '   ⚠ Club column missing in ProfileRequests table (backend will auto-create)';
        
    -- Show current columns
    PRINT '   Current ProfileRequests table columns:';
    SELECT '     - ' + COLUMN_NAME + ' (' + DATA_TYPE + 
           CASE WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
                THEN '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS VARCHAR) + ')' 
                ELSE '' END + 
           CASE WHEN IS_NULLABLE = 'YES' THEN ', NULL' ELSE ', NOT NULL' END + ')' as ColumnInfo
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'ProfileRequests' 
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT '   ⚠ ProfileRequests table does not exist (backend will auto-create with club support)';
END

PRINT '';

-- Check role constraints
PRINT '3. ROLE CONSTRAINTS:';
IF EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('Users') AND definition LIKE '%role%')
BEGIN
    SELECT '   Current role constraint: ' + definition as RoleConstraint
    FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('Users') AND definition LIKE '%role%';
    
    -- Check if it includes current roles
    DECLARE @constraint NVARCHAR(MAX)
    SELECT @constraint = definition FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('Users') AND definition LIKE '%role%'
    
    IF @constraint LIKE '%Student Coordinator%'
        PRINT '   ✓ Role constraint includes Student Coordinator';
    ELSE  
        PRINT '   ✗ Role constraint missing Student Coordinator - MIGRATION NEEDED';
        
    IF @constraint LIKE '%Faculty%'
        PRINT '   ✓ Role constraint includes Faculty';
    ELSE
        PRINT '   ✗ Role constraint missing Faculty - MIGRATION NEEDED';
END
ELSE
BEGIN
    PRINT '   ✗ No role constraint found - MIGRATION NEEDED';
END

PRINT '';

-- Check indexes
PRINT '4. PERFORMANCE INDEXES:';
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Club')
    PRINT '   ✓ Club index exists on Users table';
ELSE
    PRINT '   ✗ Club index missing on Users table - MIGRATION RECOMMENDED';

PRINT '';

-- Summary and recommendations
PRINT '=== SUMMARY AND RECOMMENDATIONS ===';
DECLARE @needsMigration BIT = 0;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'club')
   OR NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'department')
   OR NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'subject')
BEGIN
    SET @needsMigration = 1;
END

IF @needsMigration = 1
BEGIN
    PRINT 'STATUS: ⚠ MIGRATION REQUIRED';
    PRINT '';
    PRINT 'NEXT STEPS:';
    PRINT '1. Run the migration script: add_club_column_migration.sql';
    PRINT '2. Restart your backend application';
    PRINT '3. Test the signup form with Student Coordinator role';
    PRINT '';
    PRINT 'MIGRATION COMMAND:';
    PRINT 'sqlcmd -S your_server -d campusbookingdb -i add_club_column_migration.sql';
END
ELSE
BEGIN
    PRINT 'STATUS: ✓ CLUB SUPPORT IS READY';
    PRINT '';
    PRINT 'Your database already supports:';
    PRINT '- Club selection for Student Coordinator role';
    PRINT '- Department and subject fields for all users';
    PRINT '- Profile request workflow with club data';
    PRINT '';
    PRINT 'No migration needed! Your system is ready to use.';
END

PRINT '';
PRINT '=== END OF REPORT ===';
