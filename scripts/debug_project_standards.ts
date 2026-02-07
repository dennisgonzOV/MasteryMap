import "dotenv/config";
import { db } from "../server/db";
import { projects, bestStandards } from "../shared/schema";
import { eq, isNotNull, sql, inArray } from "drizzle-orm";

async function main() {
    console.log("Searching for public projects with BEST standards...");

    const results = await db
        .select({
            id: projects.id,
            title: projects.title,
            isPublic: projects.isPublic,
            bestStandardIds: projects.bestStandardIds
        })
        .from(projects)
        .where(eq(projects.isPublic, true))
        .limit(10);

    console.log("Found public projects:", JSON.stringify(results, null, 2));

    const withStandards = results.filter(p => Array.isArray(p.bestStandardIds) && p.bestStandardIds.length > 0);
    console.log(`\nFound ${withStandards.length} public projects with BEST standards assigned.`);

    if (withStandards.length > 0) {
        console.log("Sample Project ID:", withStandards[0].id);
        console.log("Standard IDs:", withStandards[0].bestStandardIds);

        const ids = withStandards[0].bestStandardIds as number[];
        console.log(`Fetching details for ${ids.length} standards...`);

        const standards = await db
            .select()
            .from(bestStandards)
            .where(inArray(bestStandards.id, ids));

        console.log("Fetched Standards:", JSON.stringify(standards, null, 2));

        if (standards.length === 0) {
            console.error("ERROR: bestStandardIds exist on project but no standards found in DB!");
        } else {
            console.log("SUCCESS: Standards found in DB.");
        }

    } else {
        console.log("No public projects found with bestStandardIds.");

        // Check if ANY projects have them
        const anyProject = await db.select().from(projects).limit(5);
        console.log("Checking first 5 projects for column existence/format:");
        anyProject.forEach(p => {
            console.log(`ID: ${p.id}, Public: ${p.isPublic}, Standards: ${JSON.stringify(p.bestStandardIds)}`);
        });
    }

    process.exit(0);
}

main().catch(console.error);
