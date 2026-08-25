// server.js — نقطة البداية: يشغّل خادم Express + قناة Socket.io اللحظية
const express = require('express');
const cors = require('cors');
const http = require('node:http');
const { Server } = require('socket.io');

const menuRouter = require('./routes/menu');
const ordersRouterFactory = require('./routes/orders');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }, // في الإنتاج: حدد نطاق موقعك بدل '*'
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'قهوة خليل API تعمل بنجاح ☕',
    status: 'online'
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'قهوة خليل API' }));
app.use('/api/menu', menuRouter);
app.use('/api/orders', ordersRouterFactory(io));

io.on('connection', (socket) => {
  console.log('🔌 عميل جديد متصل:', socket.id);
  socket.on('disconnect', () => console.log('🔌 عميل انقطع:', socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✔ خادم قهوة خليل يعمل على http://localhost:${PORT}`);
});
