"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceRoutes = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
const mssql_1 = __importDefault(require("mssql"));
const router = (0, express_1.Router)();
exports.resourceRoutes = router;
// Get all resources
router.get('/', async (req, res) => {
    try {
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request().query(`
      SELECT 
        id,
        name,
        type,
        location,
        capacity,
        description,
        isActive,
        createdAt,
        updatedAt
      FROM Resources
      WHERE isActive = 1
      ORDER BY name
    `);
        res.json({
            success: true,
            data: result.recordset
        });
    }
    catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});
// Get resource by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('id', mssql_1.default.Int, id)
            .query(`
        SELECT 
          id,
          name,
          type,
          location,
          capacity,
          description,
          isActive,
          createdAt,
          updatedAt
        FROM Resources
        WHERE id = @id AND isActive = 1
      `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        res.json({
            success: true,
            data: result.recordset[0]
        });
    }
    catch (error) {
        console.error('Error fetching resource:', error);
        res.status(500).json({ error: 'Failed to fetch resource' });
    }
});
// Search resources
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('query', mssql_1.default.NVarChar, `%${query}%`)
            .query(`
        SELECT 
          id,
          name,
          type,
          location,
          capacity,
          description
        FROM Resources
        WHERE isActive = 1
        AND (
          name LIKE @query
          OR type LIKE @query
          OR location LIKE @query
          OR description LIKE @query
        )
        ORDER BY name
      `);
        res.json({
            success: true,
            data: result.recordset
        });
    }
    catch (error) {
        console.error('Error searching resources:', error);
        res.status(500).json({ error: 'Failed to search resources' });
    }
});
// Get resource availability for a date range
router.get('/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }
        const pool = await (0, database_1.connectToDatabase)();
        // Get existing bookings for the resource in the date range
        const result = await pool.request()
            .input('resourceId', mssql_1.default.Int, id)
            .input('startDate', mssql_1.default.DateTime, new Date(startDate))
            .input('endDate', mssql_1.default.DateTime, new Date(endDate))
            .query(`
        SELECT 
          id,
          eventName,
          startDateTime,
          endDateTime,
          status
        FROM Bookings
        WHERE resourceId = @resourceId
        AND status = 'Confirmed'
        AND (
          (startDateTime >= @startDate AND startDateTime < @endDate)
          OR (endDateTime > @startDate AND endDateTime <= @endDate)
          OR (startDateTime <= @startDate AND endDateTime >= @endDate)
        )
        ORDER BY startDateTime
      `);
        res.json({
            success: true,
            data: result.recordset
        });
    }
    catch (error) {
        console.error('Error fetching resource availability:', error);
        res.status(500).json({ error: 'Failed to fetch resource availability' });
    }
});
//# sourceMappingURL=resources.js.map