const ServiceRequest = require('../models/ServiceRequest');
const Subscription = require('../models/Subscription');
const RequestQueue = require('../models/RequestQueue');
const { findNearestTechnicians, geocodeAddress } = require('../utils/geo');

exports.createServiceUsingSubscription = async (req, res) => {
  let { appliance_id, issue_desc, preferred_slot, scheduled_date, latitude, longitude, address_details } = req.body;

  // Parse address_details if it's a string
  if (typeof address_details === 'string') {
    try {
      address_details = JSON.parse(address_details);
    } catch (e) {
      console.error("Failed to parse address_details:", e);
    }
  }

  // --- Geocoding Logic ---
  let latNum = parseFloat(latitude);
  let lngNum = parseFloat(longitude);

  if (!latNum || !lngNum || latNum === 0 || lngNum === 0) {
    console.log("[SubscriptionController] Missing coordinates, attempting geocoding for:", address_details);
    const coords = await geocodeAddress(address_details);
    if (coords) {
      [latNum, lngNum] = coords;
    }
  }

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
    if (subscription.free_visits_used < 6) {
      isFreeVisit = true;
      subscription.free_visits_used += 1;
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

  // Pass pincode to geo search
  technicians = await findNearestTechnicians(latNum, lngNum, address_details?.pincode);


  const issueImages = (req.files && Array.isArray(req.files)) ? req.files.map(file => file.path) : [];

  const serviceRequest = await ServiceRequest.create({
    user_id: req.user.id,
    appliance_id,
    issue_desc,
    issue_images: issueImages,
    preferred_slot,
    scheduled_date: scheduled_date || new Date(),
    visit_fee_paid: true,
    status: 'broadcasted',
    broadcasted_to: technicians.map((t) => t._id),
    location: (latNum && lngNum && latNum !== 0 && lngNum !== 0) ? { type: 'Point', coordinates: [lngNum, latNum] } : undefined,
    address_details: address_details // Save manual address (now object)
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
