import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';

const start = async () => {
  try {
    await connectDB();
    const PORT = config.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
