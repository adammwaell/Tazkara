/**
 * API Utility - Uses relative URLs for same-origin API calls
 * When deployed to Vercel, all API calls go to the same domain
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default API_URL;
