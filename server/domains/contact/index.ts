import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../../db';
import { contactRequests, insertContactRequestSchema } from '../../../shared/schema';
import { z } from 'zod';

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour per IP
  message: { message: 'Too many contact requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactRequestWithHoneypot = insertContactRequestSchema.extend({
  website: z.string().optional(), // honeypot field
});

const router = Router();

router.post('/', contactLimiter, async (req, res) => {
  try {
    const parsed = contactRequestWithHoneypot.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: parsed.error.flatten().fieldErrors 
      });
    }

    const { website, ...contactData } = parsed.data;

    // Honeypot check - if the hidden field is filled, it's likely a bot
    if (website && website.trim() !== '') {
      console.log('Honeypot triggered - bot detected');
      // Return success to not alert bots, but don't save
      return res.status(200).json({ message: 'Thank you for your message!' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactData.email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Insert into database
    const [newRequest] = await db.insert(contactRequests).values(contactData).returning();

    console.log('Contact request saved:', newRequest.id);
    res.status(201).json({ message: 'Thank you for your message! We will get back to you soon.' });
  } catch (error) {
    console.error('Error saving contact request:', error);
    res.status(500).json({ message: 'Failed to submit contact request. Please try again.' });
  }
});

export const contactRouter = router;
