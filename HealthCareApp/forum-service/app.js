const express = require('express');
const cors = require('cors');
const postRoutes = require('./routes/posts');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'forum-service' }));
app.use('/api/posts', postRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Forum Service running on port ${PORT}`);
});
