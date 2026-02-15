const { Technician } = require('../models');


const ServiceRequest = require('../models/ServiceRequest');


exports.getAvailableRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({
      status: 'broadcasted',
      technician_id: null,
      broadcasted_to: req.user.id,
    })
      .populate({
        path: 'appliance_id',
        populate: {
          path: 'model',
          populate: {
            path: 'brand_id',
            populate: {
              path: 'category_id',
            },
          },
        },
      })
      .sort({ created_at: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getTechnicianJobs = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({
      technician_id: req.user.id,
    })
      .populate('user_id', 'name phone address')
      .populate({
        path: 'appliance_id',
        populate: {
          path: 'model',
          populate: {
            path: 'brand_id',
            populate: {
              path: 'category_id',
            },
          },
        },
      })
      .sort({ created_at: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.acceptServiceRequest = async (req, res) => {
  try {
    const technicianId = req.user.id;
    const { request_id } = req.params;

    const request = await ServiceRequest.findOneAndUpdate(
      {
        _id: request_id,
        status: 'broadcasted',
        technician_id: null,
        broadcasted_to: technicianId,
      },
      {
        technician_id: technicianId,
        status: 'accepted',
      },
      { new: true }
    );

    if (!request) {
      return res.status(409).json({
        message: 'Request already accepted by another technician',
      });
    }

    res.json({
      message: 'Service request accepted successfully',
      request,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getProfile = async (req, res) => {
  try {
    const technicianId = req.user.id; // from JWT

    const technician = await Technician.findById(technicianId).select('-password');

    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }

    res.json(technician);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateServiceStatus = async (req, res) => {
  try {
    const technicianId = req.user.id;
    const { request_id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['in_progress', 'completed'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status update',
      });
    }

    const request = await ServiceRequest.findOne({
      _id: request_id,
      technician_id: technicianId,
    });

    if (!request) {
      return res.status(404).json({
        message: 'Service request not found or not assigned to you',
      });
    }

    
    if (status === 'in_progress' && request.status !== 'accepted') {
      return res.status(409).json({
        message: 'Request must be accepted before starting',
      });
    }

    if (status === 'completed' && request.status !== 'in_progress') {
      return res.status(409).json({
        message: 'Request must be in progress before completing',
      });
    }

    request.status = status;
    await request.save();

    res.json({
      message: `Service marked as ${status}`,
      request,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const technicianId = req.user.id;
    const updates = req.body;

    
    delete updates.password;
    delete updates.role;
    delete updates.email; 

    const technician = await Technician.findByIdAndUpdate(
      technicianId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      technician,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
