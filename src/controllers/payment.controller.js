const Payment = require('../models/Payment');
const ServiceRequest = require('../models/ServiceRequest');
const Subscription = require('../models/Subscription');
const RequestQueue = require('../models/RequestQueue');
const { findNearestTechnicians, geocodeAddress } = require('../utils/geo');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

    // --- Geocoding Logic ---
    let latNum = parseFloat(latitude);
    let lngNum = parseFloat(longitude);

    if (!latNum || !lngNum || latNum === 0 || lngNum === 0) {
      console.log("[PaymentController] Missing coordinates, attempting geocoding for:", address_details);
      const coords = await geocodeAddress(address_details);
      if (coords) {
        [latNum, lngNum] = coords;
      }
    }

    // Check for active subscription
    const subscription = await Subscription.findOne({
      user_id: req.user.id,
      status: 'active',
      end_date: { $gte: new Date() }
    });

    let allowFreeVisit = false;
    let plan = 'basic';
    let priority_level = 1;

    if (subscription) {
      plan = subscription.plan;
      if (plan === 'premium') priority_level = 2;
      if (plan === 'premium_pro') priority_level = 3;

      const visitLimit = subscription.total_visits_limit || 0;
      if (subscription.free_visits_used < visitLimit) {
        allowFreeVisit = true;
      }
    }

    if (allowFreeVisit) {
      // Create request immediately
      const technicians = await findNearestTechnicians(latNum, lngNum, address_details?.pincode);
      const issueImages = (req.files && Array.isArray(req.files)) ? req.files.map(file => file.path) : [];

      const serviceRequest = await ServiceRequest.create({
        user_id: req.user.id,
        appliance_id,
        issue_desc,
        issue_images: issueImages,
        preferred_slot,
        visit_fee_paid: true,
        used_free_visit: true,
        status: 'broadcasted',
        broadcasted_to: technicians.map(t => t._id),
        subscription_plan: plan,
        priority_level,
        scheduled_date: req.body.scheduled_date || new Date(),
        location: (latNum && lngNum && latNum !== 0 && lngNum !== 0) ? { type: 'Point', coordinates: [lngNum, latNum] } : undefined,
        address_details: address_details
      });

      subscription.total_visits_used += 1;
      subscription.free_visits_used += 1;
      await subscription.save();

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
        message: 'Service request created using free visit',
        request_id: serviceRequest._id,
        technicians_found: technicians.length
      });
    }

    // Otherwise, create a Razorpay order for ₹200
    const options = {
      amount: 200 * 100, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      order,
      temp_request_data: req.body // Send back data to be used after payment verification
    });

  } catch (err) {
    console.error('Visit Fee Payment Error:', err);
    return res.status(500).json({
      message: 'Internal server error: ' + err.message,
    });
  }
};

exports.verifyVisitFee = async (req, res) => {
  const crypto = require('crypto');
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      request_data // Original data from frontend
    } = req.body;

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ message: 'Transaction not legitimate!' });
    }

    // Process the request data now that payment is verified
    let {
      appliance_id,
      issue_desc,
      preferred_slot,
      latitude,
      longitude,
      address_details
    } = request_data;

    if (typeof address_details === 'string') {
      try {
        address_details = JSON.parse(address_details);
      } catch (e) {
        console.error("Failed to parse address_details in verify:", e);
      }
    }

    let latNum = parseFloat(latitude);
    let lngNum = parseFloat(longitude);
    const technicians = await findNearestTechnicians(latNum, lngNum, address_details?.pincode);

    const serviceRequest = await ServiceRequest.create({
      user_id: req.user.id,
      appliance_id,
      issue_desc,
      preferred_slot,
      visit_fee_paid: true,
      used_free_visit: false,
      status: 'broadcasted',
      broadcasted_to: technicians.map(t => t._id),
      scheduled_date: request_data.scheduled_date || new Date(),
      location: (latNum && lngNum && latNum !== 0 && lngNum !== 0) ? { type: 'Point', coordinates: [lngNum, latNum] } : undefined,
      address_details: address_details
    });

    if (technicians.length > 0) {
      await RequestQueue.insertMany(
        technicians.map(t => ({
          request_id: serviceRequest._id,
          technician_id: t._id,
          response_status: 'pending'
        }))
      );
    }

    // Create Transaction record
    const Transaction = require('../models/Transaction');
    await Transaction.create({
      user_id: req.user.id,
      amount: 200,
      type: 'debit',
      category: 'visit_fee',
      description: 'Paid visit fee for service request',
      status: 'success',
      payment_method: 'razorpay',
      payment_id: razorpay_payment_id
    });

    return res.status(200).json({
      message: 'Payment verified and service request created',
      request_id: serviceRequest._id
    });

  } catch (err) {
    console.error('Verification Error:', err);
    return res.status(500).json({ message: 'Verification failed' });
  }
};
