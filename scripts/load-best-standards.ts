
import { db } from "../server/db";
import { bestStandards } from "../shared/schema";
import { readFileSync } from "fs";
import { join } from "path";

async function loadBestStandards() {
  try {
    console.log("Loading B.E.S.T. Standards from CSV...");
    
    // Read the CSV file
    const csvPath = join(process.cwd(), "documentation", "BestStandards.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    
    // Parse CSV (skip header row)
    const lines = csvContent.trim().split("\n");
    const headers = lines[0].split(",");
    const dataRows = lines.slice(1);
    
    console.log(`Found ${dataRows.length} rows to process`);
    
    // Clear existing data
    await db.delete(bestStandards);
    console.log("Cleared existing B.E.S.T. standards data");
    
    // Parse and consolidate data
    const standardsData = [];
    const mtrStandards = new Map(); // To consolidate MTR standards
    
    for (const row of dataRows) {
      // Handle CSV parsing with potential commas in quoted fields
      const fields = parseCSVRow(row);
      
      if (fields.length >= 6) {
        const benchmarkNumber = fields[0]?.trim() || "";
        const description = fields[1]?.trim() || "";
        const ideaStandard = fields[2]?.trim() || null;
        const subject = fields[3]?.trim() || null;
        const grade = fields[4]?.trim() || null;
        const bodyOfKnowledge = fields[5]?.trim() || null;
        
        // Check if this is an MTR (Mathematical Thinking and Reasoning) standard
        if (benchmarkNumber.match(/^MA\.K12\.MTR\.[1-7]\.1$/)) {
          // This is the main MTR standard
          mtrStandards.set(benchmarkNumber, {
            benchmarkNumber,
            description,
            ideaStandard,
            subject,
            grade,
            bodyOfKnowledge,
            additionalLines: []
          });
        } else if (benchmarkNumber === "" && description !== "" && mtrStandards.size > 0) {
          // This is likely a continuation line for the last MTR standard
          const lastMtrKey = Array.from(mtrStandards.keys()).pop();
          if (lastMtrKey) {
            const mtrStandard = mtrStandards.get(lastMtrKey);
            if (mtrStandard) {
              mtrStandard.additionalLines.push(description);
            }
          }
        } else if (benchmarkNumber !== "") {
          // Regular standard (not MTR)
          standardsData.push({
            benchmarkNumber,
            description,
            ideaStandard,
            subject,
            grade,
            bodyOfKnowledge,
          });
        }
      }
    }
    
    // Process consolidated MTR standards
    for (const [benchmarkNumber, mtrData] of mtrStandards.entries()) {
      let consolidatedDescription = mtrData.description;
      
      // Add additional lines to description
      if (mtrData.additionalLines.length > 0) {
        consolidatedDescription += " " + mtrData.additionalLines.join(" ");
      }
      
      standardsData.push({
        benchmarkNumber: mtrData.benchmarkNumber,
        description: consolidatedDescription,
        ideaStandard: mtrData.ideaStandard,
        subject: mtrData.subject,
        grade: mtrData.grade,
        bodyOfKnowledge: mtrData.bodyOfKnowledge,
      });
    }
    
    console.log(`Processed ${standardsData.length} unique standards`);
    
    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < standardsData.length; i += batchSize) {
      const batch = standardsData.slice(i, i + batchSize);
      await db.insert(bestStandards).values(batch);
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`);
    }
    
    console.log(`✅ Successfully loaded ${standardsData.length} B.E.S.T. standards`);
    
    // Verify the data
    const count = await db.select().from(bestStandards);
    console.log(`Total records in database: ${count.length}`);
    
    // Show sample of MTR standards to verify consolidation
    const mtrSample = count.filter(s => s.benchmarkNumber.startsWith('MA.K12.MTR.')).slice(0, 3);
    console.log("\nSample MTR standards after consolidation:");
    mtrSample.forEach(standard => {
      console.log(`${standard.benchmarkNumber}: ${standard.description?.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error("❌ Error loading B.E.S.T. standards:", error);
    throw error;
  }
}

// Simple CSV parser that handles quoted fields with commas
function parseCSVRow(row: string): string[] {
  const fields = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  // Add the last field
  fields.push(current);
  
  return fields.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
}

// Run the import
loadBestStandards()
  .then(() => {
    console.log("Import completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
