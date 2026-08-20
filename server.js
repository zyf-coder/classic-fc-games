const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const BASE = 'C:\\Users\\lenovo\\Desktop\\怀旧游戏\\app';

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.nes': 'application/octet-stream'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(BASE, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, {'Content-Type': contentType});
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
});
