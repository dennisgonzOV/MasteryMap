import fs from 'fs';
import path from 'path';

const testsDir = path.join(process.cwd(), 'tests', 'api');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const filePath = path.join(testsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let updated = content;

    // Replace token assignment: `token = res.body.token` -> `token = res.headers['set-cookie']`
    // Need to handle various variable names for the token (teacherToken, studentToken, authToken, token, etc.)
    updated = updated.replace(/(\w+)\s*=\s*(.+?)\.body\.token;/g, "$1 = $2.headers['set-cookie'] || [];");

    // Replace Header usage: `.set('Authorization', \`Bearer ${teacherToken}\`)` -> `.set('Cookie', teacherToken)`
    updated = updated.replace(/\.set\('Authorization', `Bearer \$\{([^}]+)\}`\)/g, ".set('Cookie', $1)");

    // Replace fixed variables explicitly if any: `.set('Authorization', \`Bearer ${studentToken}\`)`

    // There are scenarios in `auth.test.ts` where it might check `expect(response.body.token).toBeDefined()`. Let's replace that:
    updated = updated.replace(/expect\((.+?)\.body\.token\)\.toBeDefined\(\);/g, "expect($1.headers['set-cookie']).toBeDefined();");

    if (updated !== content) {
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log('Fixed auth handling in', file);
    }
}
