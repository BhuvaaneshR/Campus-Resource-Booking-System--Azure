import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../config/database';
import sql from 'mssql';

const router = Router();

// Get all resources
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = await connectToDatabase();
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

  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// Get resource by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await connectToDatabase();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
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

  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

// Search resources
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const pool = await connectToDatabase();
    
    const result = await pool.request()
      .input('query', sql.NVarChar, `%${query}%`)
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

  } catch (error) {
    console.error('Error searching resources:', error);
    res.status(500).json({ error: 'Failed to search resources' });
  }
});

// Get resource availability for a date range
router.get('/:id/availability', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const pool = await connectToDatabase();
    
    // Get existing bookings for the resource in the date range
    const result = await pool.request()
      .input('resourceId', sql.Int, id)
      .input('startDate', sql.DateTime, new Date(startDate as string))
      .input('endDate', sql.DateTime, new Date(endDate as string))
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

  } catch (error) {
    console.error('Error fetching resource availability:', error);
    res.status(500).json({ error: 'Failed to fetch resource availability' });
  }
});

export { router as resourceRoutes };
