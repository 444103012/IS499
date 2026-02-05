const http = require('http');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000/health';
const port = process.env.FRONTEND_PORT || 4000;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    // Simple HTML page that fetches backend health
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>PostgreSQL Connection Test</title>
      </head>
      <body>
        <h1>PostgreSQL Connection Test</h1>
        <button onclick="checkHealth()">Check Connection</button>
        <pre id="output"></pre>
        <script>
          async function checkHealth() {
            const output = document.getElementById('output');
            output.textContent = 'Checking...';
            try {
              const res = await fetch('${backendUrl}');
              const data = await res.json();
              output.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
              output.textContent = 'Error: ' + err.message;
            }
          }
        </script>
      </body>
      </html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(\`Frontend available at http://localhost:\${port}\`);
  console.log(\`It will call backend health at ${backendUrl}\`);
});

