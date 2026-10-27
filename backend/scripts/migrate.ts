import { resolve } from 'node:path';
import { openDatabase } from '../src/database/index.ts';
const filename = resolve(process.env.DATABASE_PATH ?? './data/opendota.sqlite');
const db = openDatabase(filename);
try { console.log(`Database migrations applied: ${filename}`); }
finally { db.close(); }
