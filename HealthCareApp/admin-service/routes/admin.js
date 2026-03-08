const express = require('express');
const axios = require('axios');
const router = express.Router();

const SERVICES = {
  users: process.env.USER_SERVICE_URL || 'http://user-management-service:3002',
  doctors: process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3005',
  appointments: process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3001',
  registrations: process.env.REGISTRATION_SERVICE_URL || 'http://registration-service:3004',
  vitals: process.env.VITAL_SERVICE_URL || 'http://vital-sign-service:3003',
  forum: process.env.FORUM_SERVICE_URL || 'http://forum-service:3007',
  complaints: process.env.COMPLAINT_SERVICE_URL || 'http://complaint-service:3008'
};

// Get aggregate stats from all services
router.get('/stats', async (req, res) => {
  try {
    const results = await Promise.allSettled([
      axios.get(`${SERVICES.users}/api/users/count/total`),
      axios.get(`${SERVICES.doctors}/api/doctors/count/total`),
      axios.get(`${SERVICES.appointments}/api/appointments/count/total`),
      axios.get(`${SERVICES.registrations}/api/registrations/count/total`),
      axios.get(`${SERVICES.vitals}/api/vitals/count/total`),
      axios.get(`${SERVICES.forum}/api/posts/count/total`),
      axios.get(`${SERVICES.complaints}/api/complaints/count/total`)
    ]);

    const stats = {
      users: results[0].status === 'fulfilled' ? results[0].value.data.count : 0,
      doctors: results[1].status === 'fulfilled' ? results[1].value.data.count : 0,
      appointments: results[2].status === 'fulfilled' ? results[2].value.data.count : 0,
      registrations: results[3].status === 'fulfilled' ? results[3].value.data.count : 0,
      vitals: results[4].status === 'fulfilled' ? results[4].value.data.count : 0,
      posts: results[5].status === 'fulfilled' ? results[5].value.data.count : 0,
      complaints: results[6].status === 'fulfilled' ? results[6].value.data.count : 0
    };

    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Health check all services
router.get('/health', async (req, res) => {
  try {
    const checks = await Promise.allSettled(
      Object.entries(SERVICES).map(([name, url]) =>
        axios.get(`${url}/health`).then(r => ({ name, status: 'up', data: r.data }))
      )
    );

    const health = checks.map(c =>
      c.status === 'fulfilled' ? c.value : { name: 'unknown', status: 'down', error: c.reason?.message }
    );

    res.json({ services: health });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Health check failed' });
  }
});

module.exports = router;
