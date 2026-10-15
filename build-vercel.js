const fs = require('fs');
const path = require('path');

const root = __dirname;
const outputDir = path.join(root, '.vercel', 'output');
const staticDir = path.join(outputDir, 'static');

// Clean and recreate static directory
if (fs.existsSync(staticDir)) {
  fs.rmSync(staticDir, { recursive: true, force: true });
}
fs.mkdirSync(staticDir, { recursive: true });

const copyList = [
  'index.html',
  'lookbook.html',
  'experience.html',
  'heritage.html',
  'account.html',
  'feedback.html',
  'styles.css',
  'script.js',
  'favicon.ico',
  'js',
  'images',
  'assets',
  'data'
];

copyList.forEach(item => {
  const src = path.join(root, item);
  const dest = path.join(staticDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Copied ${item} -> .vercel/output/static/${item}`);
  }
});

// Configure Vercel routes for static assets + serverless functions
const config = {
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '/api/(.*)', dest: '/api/index' }
  ]
};

fs.writeFileSync(path.join(outputDir, 'config.json'), JSON.stringify(config, null, 2));
console.log('✓ Vercel Build Output API v3 configured successfully.');
