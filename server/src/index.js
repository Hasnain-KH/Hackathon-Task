process.env.Timezone = process.env.Timezone || 'Asia/Karachi';

import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import CompanySettings from './models/CompanySettings.js';
import User from './models/User.js';
import { warnAiConfiguration } from './config/ai.js';

warnAiConfiguration();

async function initializeFromEnvironment() {
  if (!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)) {
    return;
  }

  if (await CompanySettings.getSingleton()) {
    console.info('HCM Lite is already initialized; environment admin setup was skipped.');
    return;
  }

  await CompanySettings.create({ companyName: 'My Company' });
  try {
    await User.create({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL,
      passwordHash: process.env.ADMIN_PASSWORD,
      role: 'admin',
      mustChangePassword: false,
    });
    console.info(`HCM Lite initialized for My Company with admin ${process.env.ADMIN_EMAIL}.`);
  } catch (error) {
    await CompanySettings.deleteOne({ _id: 'company_settings' });
    throw error;
  }
}

async function startServer() {
  try {
    await connectDB();
    await initializeFromEnvironment();
  } catch (error) {
    console.warn(`Database setup unavailable; server will start without database access: ${error.message}`);
  }

  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => console.info(`HCM Lite API listening on port ${port}.`));
}

startServer();
