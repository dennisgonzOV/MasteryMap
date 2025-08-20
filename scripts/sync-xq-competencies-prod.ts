
#!/usr/bin/env tsx

import { config } from 'dotenv';

// Load production environment variables
config({ path: '.env.production' });

// Import and run the sync function from the original script
import './sync-xq-competencies.ts';
