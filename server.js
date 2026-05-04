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

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

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
  cookie: 'lang',
  queryParameter: 'lang',
  autoReload: true,
  updateFiles: false
});
// i18n init
app.use(i18n.init);

app.use((req, res, next) => {
  // Language from query or session
  if (req.query.lang) {
    req.session.lang = req.query.lang;
    res.setLocale(req.session.lang);
    // log language change
    console.log(`Language changed to: ${req.session.lang}`);
  } else if (req.session.lang) {
    res.setLocale(req.session.lang);
  }
  // Expose helpers to all views
  res.locals.t = req.__;
  res.locals.locale = req.getLocale();
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

// Make user available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? { 
    id: req.session.userId, 
    role: req.session.userRole,
    username: req.session.username 
  } : null;
  res.locals.currentPath = req.path;
  next();
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
  console.log(process.env.MONGODB_URI);
});
