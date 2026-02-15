const ServiceRequest = require('../models/ServiceRequest');
const Subscription = require('../models/Subscription');
const RequestQueue = require('../models/RequestQueue');
const { findNearestTechnicians } = require('../utils/geo');

exports.createServiceUsingSubscription = async (req, res) => {
  const { appliance_id, issue_desc, preferred_slot, scheduled_date, latitude, longitude } = req.body;

  const subscription = await Subscription.findOne({
    user_id: req.user.id,
    status: 'active',
  });

  if (!subscription) {
    return res.status(400).json({
      message: 'No active subscription',
    });
  }

  let isFreeVisit = false;

  
  if (subscription.plan === 'premium') {
    if (subscription.free_visits_used < 2) {
      isFreeVisit = true;
      subscription.free_visits_used += 1;
    }
  }

  
  if (subscription.plan === 'premium_pro') {
    if ((subscription.total_visits_used + 1) % 3 === 0) {
      isFreeVisit = true;
    }
  }

  subscription.total_visits_used += 1;
  await subscription.save();

  if (!isFreeVisit) {
    return res.status(402).json({
      message: 'Visit fee required',
      redirect_to_payment: true,
    });
  }

  
  let technicians = [];
  if (latitude && longitude) {
    technicians = await findNearestTechnicians(latitude, longitude);
  }

  

  const serviceRequest = await ServiceRequest.create({
    user_id: req.user.id,
    appliance_id,
    issue_desc,
    preferred_slot,
    scheduled_date: scheduled_date || new Date(),
    visit_fee_paid: true,
    status: 'broadcasted',
    broadcasted_to: technicians.map((t) => t._id),
    location: (latitude && longitude) ? { coordinates: [parseFloat(longitude), parseFloat(latitude)] } : undefined,
  });

  if (technicians.length > 0) {
    await RequestQueue.insertMany(technicians.map(t => ({
      request_id: serviceRequest._id,
      technician_id: t._id,
      response_status: 'pending'
    })));
  }

  return res.status(201).json({
    message: 'Service request created using subscription',
    request_id: serviceRequest._id,
    technicians_found: technicians.length
  });
};
