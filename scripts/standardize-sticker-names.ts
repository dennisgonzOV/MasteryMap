
import { db } from "../server/db";
import { credentials } from "../shared/schema";
import { eq, and, like } from "drizzle-orm";

async function standardizeStickerNames() {
  try {
    console.log("Finding existing sticker records to standardize...");
    
    // Get all stickers
    const stickers = await db.select()
      .from(credentials)
      .where(eq(credentials.type, 'sticker'));
    
    console.log(`Found ${stickers.length} sticker records to process`);
    
    let updatedCount = 0;
    
    // Update each sticker
    for (const sticker of stickers) {
      let newTitle = sticker.title;
      let newIconUrl = sticker.iconUrl;
      let shouldUpdate = false;
      
      // Detect current level from title and standardize
      const lowerTitle = sticker.title.toLowerCase();
      
      if (lowerTitle.includes('red sticker') || lowerTitle.includes('emerging')) {
        if (!newTitle.startsWith('Emerging')) {
          newTitle = newTitle.replace(/red sticker/gi, 'Emerging');
          newTitle = newTitle.replace(/^emerging/gi, 'Emerging');
          newIconUrl = 'red';
          shouldUpdate = true;
        }
      } else if (lowerTitle.includes('yellow sticker') || lowerTitle.includes('developing')) {
        if (!newTitle.startsWith('Developing')) {
          newTitle = newTitle.replace(/yellow sticker/gi, 'Developing');
          newTitle = newTitle.replace(/^developing/gi, 'Developing');
          newIconUrl = 'yellow';
          shouldUpdate = true;
        }
      } else if (lowerTitle.includes('blue sticker') || lowerTitle.includes('proficient')) {
        if (!newTitle.startsWith('Proficient')) {
          newTitle = newTitle.replace(/blue sticker/gi, 'Proficient');
          newTitle = newTitle.replace(/^proficient/gi, 'Proficient');
          newIconUrl = 'blue';
          shouldUpdate = true;
        }
      } else if (lowerTitle.includes('green sticker') || lowerTitle.includes('applying')) {
        if (!newTitle.startsWith('Applying')) {
          newTitle = newTitle.replace(/green sticker/gi, 'Applying');
          newTitle = newTitle.replace(/^applying/gi, 'Applying');
          newIconUrl = 'green';
          shouldUpdate = true;
        }
      }
      
      if (shouldUpdate) {
        await db.update(credentials)
          .set({ 
            title: newTitle,
            iconUrl: newIconUrl
          })
          .where(eq(credentials.id, sticker.id));
        
        console.log(`Updated: "${sticker.title}" → "${newTitle}" (${newIconUrl})`);
        updatedCount++;
      }
    }
    
    console.log(`Successfully standardized ${updatedCount} sticker records`);
    process.exit(0);
  } catch (error) {
    console.error("Error standardizing sticker names:", error);
    process.exit(1);
  }
}

standardizeStickerNames();
