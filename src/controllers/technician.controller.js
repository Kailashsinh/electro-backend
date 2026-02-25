const Technician = require('../models/Technician');
const { encrypt, decrypt } = require('../utils/crypto');
const bcrypt = require('bcryptjs');

exports.uploadVerificationDocuments = async (req, res) => {
  try {
    const { aadhaar_number } = req.body;
    const technicianId = req.user.id;

    if (!aadhaar_number) {
      return res.status(400).json({ message: 'Aadhaar number is required.' });
    }

    // Check if Aadhaar number is unique
    const existingTechnician = await Technician.findOne({ aadhaar_number });
    if (existingTechnician && existingTechnician._id.toString() !== technicianId) {
      return res.status(400).json({ message: 'Aadhaar number is already registered with another account.' });
    }

    const updates = {
      aadhaar_number,
      verificationStatus: 'submitted',
      documents: {}
    };

    if (req.files['id_proof']) {
      updates.documents.id_proof = req.files['id_proof'][0].path;
    }
    if (req.files['live_photo']) {
      updates.documents.live_photo = req.files['live_photo'][0].path;
    }
    if (req.files['certification']) {
      updates.documents.certification = req.files['certification'][0].path;
    }

    // Preserve existing documents if not uploaded new ones
    const currentTech = await Technician.findById(technicianId);
    updates.documents = { ...currentTech.documents, ...updates.documents };

    const technician = await Technician.findByIdAndUpdate(
      technicianId,
      { $set: updates },
      { new: true }
    );

    res.status(200).json({ message: 'Verification documents submitted successfully.', technician });

  } catch (error) {
    res.status(500).json({ message: 'Server error during document upload.' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const technician = await Technician.findById(req.user.id).select('-password');
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    res.json(technician);
  } catch (error) {
    console.error('Error fetching technician profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required.' });
    }

    await Technician.findByIdAndUpdate(req.user.id, {
      location: {
        type: 'Point',
        coordinates: [longitude, latitude] // MongoDB uses [lng, lat]
      }
    });

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPayoutSettings = async (req, res) => {
  try {
    const technician = await Technician.findById(req.user.id).select('payment_details');
    if (!technician) return res.status(404).json({ message: 'Technician not found' });

    const details = technician.payment_details || { method: 'none' };
    const response = {
      method: details.method,
      is_verified: details.is_verified,
      bank: details.bank ? {
        bank_name: details.bank.bank_name,
        account_number: details.bank.account_number ? 'XXXXXXXX' + decrypt(details.bank.account_number).slice(-4) : null,
        ifsc_code: details.bank.ifsc_code ? decrypt(details.bank.ifsc_code) : null,
        account_holder: details.bank.account_holder ? decrypt(details.bank.account_holder) : null,
      } : null,
      upi: details.upi ? {
        upi_id: details.upi.upi_id ? decrypt(details.upi.upi_id) : null
      } : null
    };

    res.json(response);
  } catch (error) {
    console.error('getPayoutSettings Error:', error);
    res.status(500).json({ message: 'Server error fetching payout settings' });
  }
};

exports.updatePayoutSettings = async (req, res) => {
  try {
    const { password, method, bank, upi } = req.body;
    const technician = await Technician.findById(req.user.id);

    if (!technician) return res.status(404).json({ message: 'Technician not found' });

    // Verify password for security
    const isMatch = await bcrypt.compare(password, technician.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password. Security check failed.' });

    const payment_details = {
      method,
      is_verified: false, // Reset verification on change
      bank: method === 'bank' ? {
        bank_name: bank.bank_name,
        account_number: encrypt(bank.account_number),
        ifsc_code: encrypt(bank.ifsc_code),
        account_holder: encrypt(bank.account_holder)
      } : undefined,
      upi: method === 'upi' ? {
        upi_id: encrypt(upi.upi_id)
      } : undefined
    };

    technician.payment_details = payment_details;
    await technician.save();

    res.json({ message: 'Payout settings updated securely.' });
  } catch (error) {
    console.error('updatePayoutSettings Error:', error);
    res.status(500).json({ message: 'Server error updating payout settings' });
  }
};
