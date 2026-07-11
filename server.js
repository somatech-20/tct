require('dotenv').config();
const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const helmet = require('helmet');
const connectDB = require('./config/db');
const sessionConfig = require('./config/session');
const limiter = require('./middleware/rateLimiter');
const expressLayouts = require('express-ejs-layouts');
const crypto = require('crypto');
const i18n = require('i18n');
require('./cron/dailyReminder');
require('./cron/notificationReminder');
const Patient = require('./models/Patient');

// const Setting = require('./models/Setting');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// // ensure email notification setting exists
// (async () => {
//   const emailsEnabled = await Setting.findOne({ key: 'email_notifications_enabled' });
//   if (!emailsEnabled) {
//     await Setting.create({ key: 'email_notifications_enabled', value: true });
//   }
// })();

// Generate nonce for each request
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Helmet with nonce support instead of allowing 'unsafe-inline' for scripts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://cdn.tailwindcss.com",
        (req, res) => `'nonce-${res.locals.nonce}'`
      ],
      styleSrc: ["'self'", "'unsafe-inline'"], // we keep unsafe-inline for styles; could also use nonce but Tailwind CDN may inject styles
      imgSrc: ["'self'", "data:"],
    },
  },
}));

app.use(limiter);

// Body parser and method override
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session
sessionConfig(app);

i18n.configure({
  locales: ['en', 'ar', 'so'],
  directory: __dirname + '/locales',
  defaultLocale: 'en',
  // cookie: 'lang',
  // queryParameter: 'lang',
  autoReload: true,
  updateFiles: false
});
// i18n init
app.use(i18n.init);

// // Middleware to set locale, user info, theme, and current path for all views
// app.use((req, res, next) => {
//   const lang = req.session.lang || 'en';

//   req.setLocale(lang);
//   res.locals.t = req.__;
//   res.locals.locale = lang;
//   // res.locals.locale = req.getLocale();
//   res.locals.theme = req.session.theme || 'system';

//   // Set user info for views
//   res.locals.user = req.session.userId
//     ? {
//       id: req.session.userId,
//       role: req.session.userRole,
//       username: req.session.username,
//       preferredExportFormat: req.session.preferredExportFormat || 'pdf'
//     }
//     : null;

//   res.locals.currentPath = req.path;

//   next();
// });

// Middleware to set locale, user info, theme, and current path for all views
app.use((req, res, next) => {
  // Language from query or session
  if (req.query.lang) {
    req.session.lang = req.query.lang;
    res.setLocale(req.session.lang);
  } else if (req.session.lang) {
    res.setLocale(req.session.lang);
  }

  // Expose helpers to all views
  res.locals.t = req.__;
  res.locals.locale = req.getLocale();
  res.locals.theme = req.session.theme || 'system';

  // CRITICAL: Always set user, even if null
  res.locals.user = req.session.userId
    ? {
      id: req.session.userId,
      role: req.session.userRole,
      username: req.session.username,
      preferredExportFormat: req.session.preferredExportFormat || 'pdf'
    }
    : null;  // Explicitly null when not logged in

  res.locals.currentPath = req.path;
  // console.log({
  //   sessionID: req.sessionID,
  //   userId: req.session.userId,
  //   userRole: req.session.userRole,
  //   path: req.path
  // });

  next();
});

// log session info for debugging
// app.use((req, res, next) => {
//   console.log('Session Info:', {
//     userId: req.session.userId,
//     userRole: req.session.userRole,
//     username: req.session.username,
//     preferredExportFormat: req.session.preferredExportFormat,
//     lang: req.session.lang,
//     theme: req.session.theme
//   });
//   next();
// });

// Static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/set-lang', (req, res) => {
  const allowedLangs = ['en', 'ar', 'so'];

  const lang = allowedLangs.includes(req.query.lang)
    ? req.query.lang
    : 'en';

  req.session.lang = lang;

  let returnUrl = req.query.return || '/dashboard';

  // Prevent open redirects
  if (
    typeof returnUrl !== 'string' ||
    !returnUrl.startsWith('/') ||
    returnUrl.startsWith('//')
  ) {
    returnUrl = '/dashboard';
  }

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
    }

    res.redirect(returnUrl);
  });
});

// Routes
app.use('/', require('./routes/authRoutes'));
app.use('/dashboard', require('./routes/dashboardRoutes'));
app.use('/patients', require('./routes/patientRoutes'));
app.use('/patients/:patientId/treatments', require('./routes/treatmentRoutes'));
app.use('/patients/:patientId/contacts', require('./routes/contactRoutes'));
app.use('/users', require('./routes/userRoutes'));
app.use('/profile', require('./routes/profileRoutes'));
app.use('/notifications', require('./routes/notificationRoutes'));
app.use('/reports', require('./routes/reportRoutes'));

// Redirect root to dashboard or login
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// test route to daily reminder cron job
app.get('/test-email', async (req, res) => {
  try {

    // block in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).send('Forbidden');
    }

    const { dailyReminder } = require('./cron/dailyReminder');

    await dailyReminder();

    res.send('Test reminder job executed successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to execute test job');
  }
});

const User = require('./models/User');

// API endpoint for email setting (for admin only)
app.get('/api/settings/email', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = await User.findById(req.session.userId);
  if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const Setting = require('./models/Setting');
  const setting = await Setting.findOne({ key: 'email_notifications_enabled' });
  res.json({ enabled: setting ? setting.value : true });
});

// POST endpoint to update email setting
app.post('/api/settings/email', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = await User.findById(req.session.userId);
  if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { enabled } = req.body;
  const Setting = require('./models/Setting');
  await Setting.findOneAndUpdate(
    { key: 'email_notifications_enabled' },
    { value: enabled === true },
    { upsert: true }
  );
  res.json({ success: true });
});

// API endpoint for searching patients (used by returnee lookup)
app.get('/api/patients/search', async (req, res) => {
  try {
    const { query, exclude } = req.query;

    if (!query || query.length < 2) {
      return res.json([]);
    }

    // Only show patients who are NOT active (recovered or defaulted)
    // These are patients who have completed their treatment
    const patients = await Patient.find({
      $and: [
        {
          $or: [
            { fullName: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { patientId: { $regex: query, $options: 'i' } }
          ]
        },
        { status: { $in: ['Recovered', 'Defaulted'] } }, // Only completed cases
        { _id: { $ne: exclude || null } } // Exclude current patient
      ]
    })
      .limit(10)
      .select('fullName phone email district treatmentStartDate gender age patientId status');

    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Test route for creating a notification
app.get('/test-notification', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const Notification = require('./models/Notification');
  await Notification.create({
    user: req.session.userId,
    type: 'TREATMENT_REMINDER',
    title: 'Test Notification',
    message: 'This is a test notification to verify the system is working.',
    link: '/dashboard'
  });
  res.send('Test notification created');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server running on: http://localhost:${PORT}`);
  // log process memory usage for debugging
  // const memoryUsage = process.memoryUsage();
  // console.log('Memory Usage:', {
  //   rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
  //   heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
  //   heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  //   external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
  // });

  // // log memory usage every 10 seconds to monitor for leaks
  // setInterval(() => {
  //   const usage = process.memoryUsage();
  //   const mb = (n) => (n / 1024 / 1024).toFixed(2);
  //   console.log(`RSS: ${mb(usage.rss)} MB | Heap: ${mb(usage.heapUsed)}/${mb(usage.heapTotal)} MB | Ext: ${mb(usage.external)} MB`);
  // }, 10000);

  // log MODE_ENV for debugging in color green if production, yellow if development
  console.log('Environment:', process.env.NODE_ENV === 'production' ? '\x1b[32mProduction\x1b[0m' : '\x1b[33mDevelopment\x1b[0m');
  console.log('Press Ctrl+C to quit');
});
