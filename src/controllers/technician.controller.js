const Technician = require('../models/Technician');

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

    // Ensure all required docs are present (Basic validation)
    if (!updates.documents.id_proof || !updates.documents.live_photo) {
      // Note: Certification might be optional depending on business logic, but strict ID is key.
      // For now, let's require at least ID Proof and Live Photo for submission.
    }

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

