const Feedback = require('../models/Feedback');
const ServiceRequest = require('../models/ServiceRequest');
const Technician = require('../models/Technician');
const User = require('../models/User');


exports.submitFeedback = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rating, comment } = req.body;
    const submittedBy = req.user.role; 

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const service = await ServiceRequest.findOne({
      _id: requestId,
      status: 'completed',
    });

    if (!service) {
      return res.status(404).json({ message: 'Service request not found or not completed' });
    }

    
    const existingFeedback = await Feedback.findOne({
      request_id: requestId,
      submitted_by: submittedBy,
    });

    if (existingFeedback) {
      return res.status(409).json({ message: 'You have already submitted feedback for this service' });
    }

    
    const feedback = await Feedback.create({
      user_id: service.user_id,
      technician_id: service.technician_id,
      request_id: requestId,
      rating,
      comment,
      submitted_by: submittedBy,
    });

    
    if (submittedBy === 'user') {
      const feedbacks = await Feedback.find({ technician_id: service.technician_id, submitted_by: 'user' });
      const avg = feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length;
      await Technician.findByIdAndUpdate(service.technician_id, { rating: avg.toFixed(1) });
    } else {
      const feedbacks = await Feedback.find({ user_id: service.user_id, submitted_by: 'technician' });
      const avg = feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length;
      await User.findByIdAndUpdate(service.user_id, { rating: avg.toFixed(1) });
    }

    res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (err) {
    console.error('Submit Feedback Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTechnicianFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({
      technician_id: req.user.id,
    })
      .populate('user_id', 'name')
      .sort({ created_at: -1 });

    res.json(feedbacks);
  } catch (err) {
    console.error('Get Feedback Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
