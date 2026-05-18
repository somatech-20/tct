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

// Middleware to set locale, user info, theme, and current path for all views
app.use((req, res, next) => {
  const lang = req.session.lang || 'en';

  req.setLocale(lang);
  res.locals.t = req.__;
  res.locals.locale = lang;

  res.locals.theme = req.session.theme || 'system';

  res.locals.user = req.session.userId
    ? {
        id: req.session.userId,
        role: req.session.userRole,
        username: req.session.username,
      }
    : null;

  res.locals.currentPath = req.path;

  next();
});

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
  // console.log(process.env.MONGODB_URI);
  console.log(process.env.NODE_ENV);
});
