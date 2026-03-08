const express = require('express');
const cors = require('cors');
const doctorRoutes = require('./routes/doctors');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'doctor-service' }));
app.use('/api/doctors', doctorRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Doctor Service running on port ${PORT}`);
});
