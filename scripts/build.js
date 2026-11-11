import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['public', 'src', 'data', 'server.js', 'package.json', 'README.md', 'firestore.rules', 'firestore.indexes.json', 'firebase.json']) await cp(file, `dist/${file}`, { recursive: true });
console.log('Built dist/. Run: cd dist && npm start');
