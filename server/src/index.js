const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const root = path.join(__dirname, '../..');
const app = express();
app.use(express.json());
app.use('/vendor/bootstrap', express.static(path.join(root, 'node_modules/bootstrap/dist')));
app.use('/vendor/poppins', express.static(path.join(root, 'node_modules/@fontsource/poppins')));
app.use(express.static(path.join(root, 'client')));
app.use('/api/students', require('./routes/students'));
app.use('/api', require('./routes/payments'));
app.use('/api', require('./routes/attendance'));
app.use('/api/summary', require('./routes/summary'));
app.use((err, req, res, next) => {
  console.error(err.message);
  const down = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST'].includes(err.code);
  res.status(err.status || 500).json({
    error: err.status ? err.message : down ? 'Cannot reach the database. Is MariaDB running?' : 'Server error. Please try again.',
  });
});
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`BSIT Tracker running: http://localhost:${port}`));
