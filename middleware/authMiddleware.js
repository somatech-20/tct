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

const isReceptionist = (req, res, next) => {
  if (req.session.userRole === 'receptionist') {
    return next();
  }
  res.status(403).send('Access denied. Receptionist privileges required.');
}

const isDoctorOrReceptionist = (req, res, next) => {
  if (req.session.userRole === 'doctor' || req.session.userRole === 'receptionist') {
    return next();
  }
  res.status(403).send('Access denied. Doctor or Receptionist privileges required.');
};

module.exports = { isAuthenticated, isDoctor, isAdmin, isReceptionist, isDoctorOrReceptionist };
