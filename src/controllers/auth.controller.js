const jwt = require('jsonwebtoken');

const { User, Technician, Admin } = require('../models');
const Otp = require('../models/Otp');
const Subscription = require('../models/Subscription');

const { hashPassword, comparePassword } = require('../utils/password');
const { generateOtp, getOtpExpiry } = require('../utils/otp');
const sendEmail = require('../utils/email');


const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};


exports.registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const exists = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (exists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);


    const otp = generateOtp();
    await Otp.deleteMany({ email, role: 'user_verification' });


    await Otp.create({
      email,
      role: 'user_verification',
      otp,
      expiresAt: getOtpExpiry(),
      registrationData: {
        name,
        email,
        phone,
        password: hashedPassword,
        address,
        isVerified: true
      }
    });


    const subject = 'ElectroCare: Verify Your Email';
    const html = `
      <h3>Welcome to ElectroCare!</h3>
      <p>Please use the OTP below to verify your email address:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for 10 minutes.</p>
    `;
    await sendEmail(email, subject, html);

    res.status(201).json({ message: 'OTP sent. Please verify your email to complete registration.', email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.resendVerificationUser = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User is already verified' });


    const otp = generateOtp();
    await Otp.deleteMany({ email, role: 'user_verification' });

    await Otp.create({
      email,
      role: 'user_verification',
      otp,
      expiresAt: getOtpExpiry(),

    });


    const subject = 'ElectroCare: Verify Your Email';
    const html = `
      <h3>Email Verification</h3>
      <p>Use this OTP to verify your account:</p>
      <h1>${otp}</h1>
      <p>Valid for 10 minutes.</p>
    `;
    await sendEmail(email, subject, html);

    res.json({ message: 'Verification OTP sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.verifyEmailUser = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({ email, otp, role: 'user_verification' });
    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (!record.registrationData) {

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        existingUser.isVerified = true;
        await existingUser.save();
        await Otp.deleteMany({ email, role: 'user_verification' });
        const token = generateToken(existingUser._id, 'user');
        return res.json({ message: 'Email verified successfully', token, user: existingUser });
      }
      return res.status(400).json({ message: 'Registration data not found. Please register again.' });
    }


    const userData = record.registrationData;
    const user = await User.create(userData);

    // Create Default Gold Subscription
    await Subscription.create({
      user_id: user._id,
      plan: 'gold',
      start_date: new Date(),
      end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 100)), // Lifetime validity for free plan
      status: 'active',
      total_visits_limit: 0,
      free_visits_used: 0
    });

    await Otp.deleteMany({ email, role: 'user_verification' });

    const token = generateToken(user._id, 'user');
    res.json({ message: 'Email verified successfully', token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Missing credentials' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified === false) {
      return res.status(403).json({ message: 'Please verify your email address first.' });
    }

    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, 'user');
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.forgotPasswordUser = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    const otp = generateOtp();

    await Otp.deleteMany({ email, role: 'user' });

    await Otp.create({
      email,
      role: 'user',
      otp,
      expiresAt: getOtpExpiry(),
    });

    // Send Email
    const subject = 'ElectroCare: Password Reset OTP';
    const html = `
      <h3>Password Reset Request</h3>
      <p>Your OTP for resetting your password is: <b>${otp}</b></p>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;
    await sendEmail(email, subject, html);

    res.json({ message: 'OTP sent to your email successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.resetPasswordUser = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const record = await Otp.findOne({ email, otp, role: 'user' });
    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await User.updateOne({ email }, { password: hashedPassword });

    await Otp.deleteMany({ email, role: 'user' });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// TECHNICIAN REGISTER
exports.registerTechnician = async (req, res) => {
  try {
    const { name, email, phone, password, skills, latitude, longitude, pincode } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const exists = await Technician.findOne({
      $or: [{ email }, { phone }],
    });

    if (exists) {
      return res.status(400).json({ message: 'Technician already exists' });
    }

    const hashedPassword = await hashPassword(password);

    // Default location if not provided (0,0)
    const lat = latitude || 0;
    const lng = longitude || 0;

    // Generate & Send OTP for verification
    const otp = generateOtp();
    await Otp.deleteMany({ email, role: 'technician_verification' });

    // Store data in OTP
    await Otp.create({
      email,
      role: 'technician_verification',
      otp,
      expiresAt: getOtpExpiry(),
      registrationData: {
        name,
        email,
        phone,
        password: hashedPassword,
        skills,
        pincode, // Store pincode
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        isVerified: true
      }
    });

    // Send Email
    const subject = 'ElectroCare: Verify Technician Account';
    const html = `
      <h3>Welcome Partner!</h3>
      <p>Please use the OTP below to verify your technician account:</p>
      <h1>${otp}</h1>
    `;
    await sendEmail(email, subject, html);

    res.status(201).json({ message: 'OTP sent. Please verify your email.', email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// RESEND VERIFICATION TECHNICIAN
exports.resendVerificationTechnician = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const tech = await Technician.findOne({ email });
    if (!tech) return res.status(404).json({ message: 'Technician not found' });
    if (tech.isVerified) return res.status(400).json({ message: 'Technician is already verified' });

    const otp = generateOtp();
    await Otp.deleteMany({ email, role: 'technician_verification' });

    await Otp.create({
      email,
      role: 'technician_verification',
      otp,
      expiresAt: getOtpExpiry(),
    });

    const subject = 'ElectroCare: Verify Technician Account';
    const html = `
      <h3>Technician Verification</h3>
      <p>Use this OTP to verify your account:</p>
      <h1>${otp}</h1>
    `;
    await sendEmail(email, subject, html);

    res.json({ message: 'Verification OTP sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// TECHNICIAN VERIFY EMAIL
exports.verifyEmailTechnician = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({ email, otp, role: 'technician_verification' });
    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (!record.registrationData) {
      // Fallback checks
      const existingTech = await Technician.findOne({ email });
      if (existingTech) {
        existingTech.isVerified = true;
        await existingTech.save();
        await Otp.deleteMany({ email, role: 'technician_verification' });
        const token = generateToken(existingTech._id, 'technician');
        return res.json({ message: 'Email verified successfully', token, technician: existingTech });
      }
      return res.status(400).json({ message: 'Registration data not found. Please register again.' });
    }

    const techData = record.registrationData;
    const technician = await Technician.create(techData);

    await Otp.deleteMany({ email, role: 'technician_verification' });

    const token = generateToken(technician._id, 'technician');
    res.json({ message: 'Email verified successfully', token, technician });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// TECHNICIAN LOGIN
exports.loginTechnician = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Missing credentials' });
    }

    const technician = await Technician.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }

    if (technician.isVerified === false) {
      return res.status(403).json({ message: 'Please verify your email address first.' });
    }

    const match = await comparePassword(password, technician.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(technician._id, 'technician');
    res.json({ token, technician });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   TECHNICIAN FORGOT PASSWORD (EMAIL OTP)
===================================================== */
exports.forgotPasswordTechnician = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const technician = await Technician.findOne({ email });
    if (!technician) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    const otp = generateOtp();

    await Otp.deleteMany({ email, role: 'technician' });

    await Otp.create({
      email,
      role: 'technician',
      otp,
      expiresAt: getOtpExpiry(),
    });

    // Send Email
    const subject = 'ElectroCare Technician: Password Reset OTP';
    const html = `
      <h3>Technician Password Reset Request</h3>
      <p>Your OTP for resetting your password is: <b>${otp}</b></p>
      <p>This OTP is valid for 10 minutes.</p>
    `;
    await sendEmail(email, subject, html);

    res.json({ message: 'OTP sent to your email successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   TECHNICIAN RESET PASSWORD
===================================================== */
exports.resetPasswordTechnician = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const record = await Otp.findOne({ email, otp, role: 'technician' });
    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await Technician.updateOne({ email }, { password: hashedPassword });

    await Otp.deleteMany({ email, role: 'technician' });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
   ADMIN AUTH (LOGIN ONLY)
===================================================== */

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing credentials' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const match = await comparePassword(password, admin.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(admin._id, 'admin');
    res.json({ token, admin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};