
import { db } from "../server/db";
import { credentials } from "../shared/schema";
import { eq, and, like } from "drizzle-orm";

async function updateYellowStickers() {
  try {
    console.log("Finding existing Yellow Sticker records...");
    
    // First, find all stickers with "Yellow Sticker" in the title
    const yellowStickers = await db.select()
      .from(credentials)
      .where(and(
        eq(credentials.type, 'sticker'),
        like(credentials.title, '%Yellow Sticker%')
      ));
    
    console.log(`Found ${yellowStickers.length} yellow sticker records to update`);
    
    // Update each one
    for (const sticker of yellowStickers) {
      const newTitle = sticker.title.replace('Yellow Sticker', 'Developing Sticker');
      
      await db.update(credentials)
        .set({ title: newTitle })
        .where(eq(credentials.id, sticker.id));
      
      console.log(`Updated: "${sticker.title}" → "${newTitle}"`);
    }
    
    console.log("Successfully updated all yellow sticker records");
    process.exit(0);
  } catch (error) {
    console.error("Error updating yellow stickers:", error);
    process.exit(1);
  }
}

updateYellowStickers();
