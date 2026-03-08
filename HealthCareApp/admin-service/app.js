const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3009;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'admin-service' }));
app.use('/api/admin', adminRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin Service running on port ${PORT}`);
});
