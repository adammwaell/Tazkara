/**
 * Events API Routes - Next.js API Handler
 * GET /api/events - list active events
 * GET /api/events/all - all events (admin)
 * GET /api/events/:id - single event
 * POST /api/events - create event (admin)
 */

import dbConnect from '../../../lib/db';
import Event from '../../../models/Event';
import { authenticate, requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    await dbConnect();

    // GET /api/events or /api/events/all
    if (method === 'GET') {
      // Admin endpoint - all events
      if (req.url.includes('/all')) {
        const auth = await authenticate(req);
        if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
        
        const adminError = requireAdmin(auth.user);
        if (adminError) return res.status(adminError.status).json({ success: false, message: adminError.message });

        const events = await Event.find().sort({ date: -1 }).populate('createdBy', 'name picture');
        return res.json({ success: true, count: events.length, events });
      }

      // Get single event by ID
      if (id) {
        const event = await Event.findById(id).populate('createdBy', 'name picture');
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        return res.json({ success: true, event });
      }

      // List active events
      const events = await Event.find({ isActive: true }).sort({ date: 1 }).populate('createdBy', 'name picture');
      return res.json({ success: true, count: events.length, events });
    }

    // POST /api/events - create event
    if (method === 'POST') {
      const auth = await authenticate(req);
      if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });

      const adminError = requireAdmin(auth.user);
      if (adminError) return res.status(adminError.status).json({ success: false, message: adminError.message });

      const { name, date, venue, description, image, categories } = req.body;

      // Build wave 1 categories
      let wave1Categories = [];
      if (categories && categories.length > 0) {
        wave1Categories = categories.map(c => ({
          type: c.type,
          label: c.label || '',
          price: Number(c.price) || 0,
          totalSeats: Number(c.seats) || 0,
          remainingSeats: Number(c.seats) || 0,
          soldSeats: 0,
        }));
      }

      const event = await Event.create({
        name,
        date: new Date(date),
        venue,
        description,
        image,
        createdBy: auth.user._id,
        waves: [{
          name: 'Wave 1',
          description: 'First release',
          isActive: true,
          categories: wave1Categories,
        }],
        isActive: true,
      });

      return res.status(201).json({ success: true, event });
    }

    return res.status(404).json({ success: false, message: 'Method not allowed' });

  } catch (err) {
    console.error('[events API]', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
