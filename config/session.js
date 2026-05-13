const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = (app) => {
  app.set('trust proxy', 1); // trust first proxy for secure cookies behind reverse proxy
  
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      touchAfter: 24 * 3600
    }).on('error', (err) => console.error('Session store error:', err)),
    cookie: {
      secure: process.env.NODE_ENV === 'production' ? true : false,   // force false for local HTTP
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24
    }
  }));
};