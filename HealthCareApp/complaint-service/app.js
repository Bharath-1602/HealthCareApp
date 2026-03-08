const express = require('express');
const cors = require('cors');
const complaintRoutes = require('./routes/complaints');

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'complaint-service' }));
app.use('/api/complaints', complaintRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Complaint Service running on port ${PORT}`);
});
