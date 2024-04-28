import { document } from './documentBase';
import * as fs from 'node:fs';
import path from 'path';

console.log('Writing OpenAPI document to openapi.json');
fs.writeFileSync(path.join('openapi.json'), JSON.stringify(document, null, 2));
