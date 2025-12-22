const fs = require('fs');
const path = 'src/app/blog/[slug]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace **text** with <strong>text</strong>
content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced markdown formatting with HTML');
