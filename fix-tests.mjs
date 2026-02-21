import fs from 'fs';
import path from 'path';

const testsDir = path.join(process.cwd(), 'tests', 'api');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const filePath = path.join(testsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace "token =" with capturing cookies if possible, or just use agent.
    // It's actually complex to parse automatically. Let me just replace `request(app)` with `agent` if possible, but the variable is already `request`.
    // Actually, maybe I can just extract cookies:
    // const cookies = res.headers['set-cookie'];
    // And `.set('Cookie', cookies)`
}
