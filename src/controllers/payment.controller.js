const Payment = require('../models/Payment');
const ServiceRequest = require('../models/ServiceRequest');
const Subscription = require('../models/Subscription');
const RequestQueue = require('../models/RequestQueue');
const { findNearestTechnicians } = require('../utils/geo');

exports.payVisitFee = async (req, res) => {
  try {
    const {
      appliance_id,
      issue_desc,
      preferred_slot,
      method, 
      latitude,
      longitude
    } = req.body;

    if (!appliance_id || !issue_desc) {
      return res.status(400).json({
        message: 'Missing required fields',
      });
    }

  
    const subscription = await Subscription.findOne({
      user_id: req.user.id,
      status: 'active',
    });

    let plan = 'basic';
    let priority_level = 1;
    let allowFreeVisit = false;

    if (subscription) {
      plan = subscription.plan;

      if (plan === 'premium') {
        priority_level = 2;
        allowFreeVisit = subscription.free_visits_used < 2;
      }

      if (plan === 'premium_pro') {
        priority_level = 3;
        allowFreeVisit =
          (subscription.total_visits_used + 1) % 3 === 0;
      }
    }

    
    let visit_fee_paid = false;

    if (!allowFreeVisit) {
      if (!method) {
        return res.status(402).json({
          message: 'Visit fee required',
          redirect_to_payment: true,
        });
      }

      await Payment.create({
        user_id: req.user.id,
        amount: 200,
        type: 'visit_fee',
        method,
        status: 'success',
        technician_share: 150,
        platform_share: 50,
        paid_at: new Date(),
      });

      const Transaction = require('../models/Transaction');
      await Transaction.create({
        user_id: req.user.id,
        amount: 200,
        type: 'debit',
        category: 'visit_fee_payment',
        description: 'Visit fee payment',
        status: 'success'
      });

      visit_fee_paid = true;
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
      visit_fee_paid,
      status: 'broadcasted',
      broadcasted_to: technicians.map(t => t._id),
      subscription_plan: plan,
      priority_level,
      scheduled_date: req.body.scheduled_date || new Date(), // Fallback for now
      preferred_slot: req.body.preferred_slot,
      location: (latitude && longitude) ? { coordinates: [parseFloat(longitude), parseFloat(latitude)] } : undefined,
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
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};
