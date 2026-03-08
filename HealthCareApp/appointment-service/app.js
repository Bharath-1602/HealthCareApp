const express = require('express');
const cors = require('cors');
const appointmentRoutes = require('./routes/appointments');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'appointment-service' }));
app.use('/api/appointments', appointmentRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Appointment Service running on port ${PORT}`);
});
