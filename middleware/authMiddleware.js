const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
};

const isAdmin = (req, res, next) => {
  if (req.session.userRole === 'admin') {
    return next();
  }
  res.status(403).send('Access denied. Admin privileges required.');
};

const isDoctor = (req, res, next) => {
  if (req.session.userRole === 'doctor') {
    return next();
  }
  res.status(403).send('Access denied. Doctor privileges required.');
};

module.exports = { isAuthenticated, isDoctor, isAdmin };
