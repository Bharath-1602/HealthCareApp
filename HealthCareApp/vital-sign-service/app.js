const express = require('express');
const cors = require('cors');
const vitalRoutes = require('./routes/vitals');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'vital-sign-service' }));
app.use('/api/vitals', vitalRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vital Sign Service running on port ${PORT}`);
});
