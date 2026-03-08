const express = require('express');
const cors = require('cors');
const registrationRoutes = require('./routes/registrations');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'registration-service' }));
app.use('/api/registrations', registrationRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Registration Service running on port ${PORT}`);
});
