const Payment = require('../models/Payment');
const ServiceRequest = require('../models/ServiceRequest');
const Subscription = require('../models/Subscription');
const RequestQueue = require('../models/RequestQueue');
const { findNearestTechnicians } = require('../utils/geo');

exports.payVisitFee = async (req, res) => {
  try {
    let {
      appliance_id,
      issue_desc,
      preferred_slot,
      method,
      latitude,
      longitude,
      address_details
    } = req.body;

    // Parse address_details if it's a string (FormData sends everything as string)
    if (typeof address_details === 'string') {
      try {
        address_details = JSON.parse(address_details);
      } catch (e) {
        console.error("Failed to parse address_details:", e);
      }
    }

    // Check for active subscription
    const subscription = await Subscription.findOne({
      user_id: req.user.id,
      status: 'active',
      end_date: { $gte: new Date() }
    });

    let visit_fee_paid = false;
    let allowFreeVisit = false;
    let plan = 'basic';
    let priority_level = 1;

    if (subscription) {
      plan = subscription.plan;
      // Determine priority
      if (plan === 'premium') priority_level = 2;
      if (plan === 'premium_pro') priority_level = 3;

      // Check free visit eligibility
      // Basic: 0 free
      // Premium: 3 free
      // Premium Pro: Unlimited (or specialized logic?)

      // Let's use the fields from subscription model if available, or hardcode rules
      // Assumed rules based on previous tasks:
      const visitLimit = subscription.total_visits_limit || 0;
      if (subscription.free_visits_used < visitLimit) {
        allowFreeVisit = true;
        visit_fee_paid = true;
      }
    }

    // If not free visit, we assume payment is handled via gateway (mocked here)
    if (!allowFreeVisit) {
      // In a real app, verifying payment_id would happen here
      visit_fee_paid = true; // For now, assume payment success if they hit this endpoint
    }

    let technicians = [];
    // Convert to numbers explicitly
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    // Pass pincode to geo search
    technicians = await findNearestTechnicians(latNum, lngNum, address_details?.pincode);

    const issueImages = (req.files && Array.isArray(req.files)) ? req.files.map(file => file.path) : [];

    const serviceRequest = await ServiceRequest.create({
      user_id: req.user.id,
      appliance_id,
      issue_desc,
      issue_images: issueImages,
      preferred_slot,
      visit_fee_paid,
      used_free_visit: allowFreeVisit,
      status: 'broadcasted',
      broadcasted_to: technicians.map(t => t._id),
      subscription_plan: plan,
      priority_level,
      scheduled_date: req.body.scheduled_date || new Date(),
      location: (latNum && lngNum && latNum !== 0 && lngNum !== 0) ? { type: 'Point', coordinates: [lngNum, latNum] } : undefined,
      address_details: address_details // Save manual address (now object)
    });


    if (subscription) {
      subscription.total_visits_used += 1;

      if (allowFreeVisit) {
        subscription.free_visits_used += 1;
      }

      await subscription.save();
    }


    if (technicians.length > 0) {
      await RequestQueue.insertMany(
        technicians.map(t => ({
          request_id: serviceRequest._id,
          technician_id: t._id,
          response_status: 'pending'
        }))
      );
    }

    return res.status(201).json({
      message: allowFreeVisit
        ? 'Service request created using free visit'
        : 'Visit fee paid & service request created',
      request_id: serviceRequest._id,
      technicians_found: technicians.length
    });

  } catch (err) {
    console.error('Visit Fee Payment Error:', err);
    console.error('Stack:', err.stack);
    return res.status(500).json({
      message: 'Internal server error: ' + err.message,
    });
  }
};
