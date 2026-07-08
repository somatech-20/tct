const Patient = require('../models/Patient');
const TreatmentLog = require('../models/TreatmentLog');
const User = require('../models/User');
const Notification = require('../models/Notification');

exports.index = async (req, res) => {
  try {
    const role = req.session.userRole;
    const userId = req.session.userId;
    
    // Base data for all roles - user is already in res.locals
    // but we need to pass it explicitly if the view uses it
    const baseData = {
      role: role,
      // user is already in res.locals, but we can pass it explicitly
      user: {
        id: req.session.userId,
        role: req.session.userRole,
        username: req.session.username,
        preferredExportFormat: req.session.preferredExportFormat || 'pdf'
      }
    };

    // ==================== ADMIN DASHBOARD ====================
    if (role === 'admin') {
      const totalPatients = await Patient.countDocuments();
      const totalDoctors = await User.countDocuments({ role: 'doctor' });
      const totalReceptionists = await User.countDocuments({ role: 'receptionist' });
      const totalActive = await Patient.countDocuments({ status: 'Active' });
      const totalRecovered = await Patient.countDocuments({ status: 'Recovered' });
      const totalDefaulters = await Patient.countDocuments({ status: 'Defaulted' });
      
      // Recent patients (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentPatients = await Patient.find({
        createdAt: { $gte: sevenDaysAgo }
      })
      .sort('-createdAt')
      .limit(10)
      .populate('registeredBy', 'username fullName')
      .populate('assignedDoctor', 'username fullName');

      // Unread notifications count
      const unreadNotifications = await Notification.countDocuments({ 
        read: false 
      });

      return res.render('dashboard/admin', {
        ...baseData,
        totalPatients,
        totalDoctors,
        totalReceptionists,
        totalActive,
        totalRecovered,
        totalDefaulters,
        recentPatients,
        unreadNotifications
      });
    }

    // ==================== DOCTOR DASHBOARD ====================
    if (role === 'doctor') {
      // Today's date range
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Patients assigned to this doctor
      const assignedPatients = await Patient.find({
        assignedDoctor: userId
      });

      // Today's patients (assigned and treatment start date is today)
      const todayPatients = await Patient.find({
        assignedDoctor: userId,
        treatmentStartDate: { $gte: startOfDay, $lte: endOfDay }
      })
      .populate('registeredBy', 'username fullName')
      .sort('-createdAt');

      // Stats for assigned patients
      const totalAssigned = assignedPatients.length;
      const activeAssigned = assignedPatients.filter(p => p.status === 'Active').length;
      const recoveredAssigned = assignedPatients.filter(p => p.status === 'Recovered').length;
      const defaultedAssigned = assignedPatients.filter(p => p.status === 'Defaulted').length;

      // Missed dose alerts (patients who missed dose for 2+ days)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const missedDosePatients = [];
      for (const patient of assignedPatients) {
        const lastLog = await TreatmentLog.findOne({
          patient: patient._id
        }).sort({ date: -1 });
        
        if (!lastLog || lastLog.date < twoDaysAgo) {
          const daysMissed = lastLog 
            ? Math.floor((today - lastLog.date) / (1000 * 60 * 60 * 24))
            : 3;
          missedDosePatients.push({
            ...patient.toObject(),
            missedDays: daysMissed
          });
        }
      }

      // Unread notifications for this doctor
      const unreadNotifications = await Notification.countDocuments({
        user: userId,
        read: false
      });

      // Recent notifications
      const recentNotifications = await Notification.find({
        user: userId
      })
      .sort('-createdAt')
      .limit(5);

      return res.render('dashboard/doctor', {
        ...baseData,
        totalAssigned,
        activeAssigned,
        recoveredAssigned,
        defaultedAssigned,
        todayPatients,
        missedDosePatients: missedDosePatients.slice(0, 10),
        unreadNotifications,
        recentNotifications
      });
    }

    // ==================== RECEPTIONIST DASHBOARD ====================
    if (role === 'receptionist') {
      // Patients registered by this receptionist
      const registeredPatients = await Patient.find({
        registeredBy: userId
      });

      const totalRegistered = registeredPatients.length;
      const activeRegistered = registeredPatients.filter(p => p.status === 'Active').length;
      const recoveredRegistered = registeredPatients.filter(p => p.status === 'Recovered').length;
      const defaultedRegistered = registeredPatients.filter(p => p.status === 'Defaulted').length;

      // Recent registrations (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentRegistrations = await Patient.find({
        registeredBy: userId,
        createdAt: { $gte: sevenDaysAgo }
      })
      .sort('-createdAt')
      .limit(10)
      .populate('assignedDoctor', 'username fullName');

      // Today's registrations count
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const todayRegistrations = await Patient.countDocuments({
        registeredBy: userId,
        createdAt: { $gte: startOfDay }
      });

      // Incomplete records (missing district, assignedDoctor, or emergency contact)
      const incompletePatients = await Patient.find({
        registeredBy: userId,
        $or: [
          { district: { $exists: false } },
          { district: null },
          { district: '' },
          { assignedDoctor: { $exists: false } },
          { 'emergencyContact.name': { $exists: false } },
          { 'emergencyContact.name': '' }
        ]
      })
      .select('fullName patientId createdAt')
      .limit(5);

      return res.render('dashboard/receptionist', {
        ...baseData,
        totalRegistered,
        activeRegistered,
        recoveredRegistered,
        defaultedRegistered,
        todayRegistrations,
        recentRegistrations,
        incompleteCount: incompletePatients.length,
        incompletePatients
      });
    }

    // Fallback for unknown role
    return res.status(403).send('Access denied');

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Server Error');
  }
};