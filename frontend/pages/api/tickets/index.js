/**
 * Tickets API Routes - Next.js API Handler
 * GET /api/tickets/my - get user's tickets
 */

import dbConnect from '../../../lib/db';
import Ticket from '../../../models/Ticket';
import { authenticate } from '../../../lib/auth';

export default async function handler(req, res) {
  const { method } = req;

  try {
    await dbConnect();

    // GET /api/tickets/my
    if (method === 'GET') {
      const auth = await authenticate(req);
      if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });

      const tickets = await Ticket.find({ user: auth.user._id })
        .populate('event', 'name date venue image')
        .populate('order', 'totalAmount')
        .sort({ createdAt: -1 });

      return res.json({ success: true, tickets });
    }

    return res.status(404).json({ success: false, message: 'Method not allowed' });

  } catch (err) {
    console.error('[tickets API]', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
