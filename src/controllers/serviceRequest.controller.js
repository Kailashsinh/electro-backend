const mongoose = require('mongoose');
const ServiceRequest = require('../models/ServiceRequest');
const Technician = require('../models/Technician');
const Notification = require('../models/Notification');
const RequestQueue = require('../models/RequestQueue');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

exports.acceptServiceRequest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const technicianId = req.user.id;
    const { requestId } = req.params;

    session.startTransaction();

    const technician = await Technician.findById(technicianId).session(session);


    if (!technician) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Technician not found' });
    }

    if (technician.status === 'suspended') {
      await session.abortTransaction();
      return res.status(403).json({
        message: `Account suspended until ${technician.suspended_until.toDateString()}`,
      });
    }

    if (technician.status === 'inactive') {
      await session.abortTransaction();
      return res.status(403).json({
        message: 'Technician is currently inactive',
      });
    }

    const targetRequest = await ServiceRequest.findById(requestId).session(session);
    if (!targetRequest) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Service request not found' });
    }

    // Check for slot conflict
    const conflict = await ServiceRequest.findOne({
      technician_id: technicianId,
      status: { $in: ['accepted', 'on_the_way', 'awaiting_approval', 'approved', 'in_progress'] },
      scheduled_date: targetRequest.scheduled_date,
      preferred_slot: targetRequest.preferred_slot
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return res.status(403).json({
        message: 'You already have another job scheduled for this date and time slot.',
      });
    }

    const serviceRequest = await ServiceRequest.findOneAndUpdate(
      {
        _id: requestId,
        status: { $in: ['pending', 'broadcasted'] },
        $or: [{ technician_id: null }, { technician_id: { $exists: false } }],
      },
      {
        status: 'accepted',
        technician_id: technicianId,
        accepted_at: new Date(),
      },
      { new: true, session }
    );

    if (!serviceRequest) {
      await session.abortTransaction();
      return res.status(409).json({
        message: 'Service request already accepted or no longer available',
      });
    }

    // Do NOT set technician to busy/is_available:false here, they can take other slots.

    await RequestQueue.findOneAndUpdate(
      { request_id: requestId, technician_id: technicianId },
      { response_status: 'accepted', response_time: new Date() },
      { session }
    );

    await session.commitTransaction();

    await Notification.create({
      recipient_id: serviceRequest.user_id,
      recipient_model: 'User',
      title: 'Technician Assigned',
      message: 'A technician has accepted your service request.',
    });

    return res.json({
      message: 'Service request accepted successfully',
      serviceRequest,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Accept Service Request Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};

exports.markOnTheWay = async (req, res) => {
  const { requestId } = req.params;

  console.log(`[MarkOnTheWay] Request: ${requestId}, Tech: ${req.user.id}`);

  const service = await ServiceRequest.findOneAndUpdate(
    {
      _id: requestId,
      technician_id: req.user.id,
      status: 'accepted',
    },
    {
      status: 'on_the_way',
      on_the_way_at: new Date(),
    },
    { new: true }
  );

  if (!service) {
    const check = await ServiceRequest.findById(requestId);
    console.error(`[MarkOnTheWay] Failed. Service State:`, check);
    return res.status(403).json({ message: 'Not allowed' });
  }

  // Set technician to busy/unavailable while they are actively on a job
  await Technician.findByIdAndUpdate(req.user.id, {
    status: 'busy',
    is_available: false
  });

  await Notification.create({
    recipient_id: service.user_id,
    recipient_model: 'User',
    title: 'Technician On The Way',
    message: 'Your technician has started travelling.',
  });

  res.json({ message: 'Technician is on the way' });
};


exports.submitEstimate = async (req, res) => {
  const { requestId } = req.params;
  const { estimated_service_cost } = req.body;

  const service = await ServiceRequest.findOneAndUpdate(
    {
      _id: requestId,
      technician_id: req.user.id,
      status: 'on_the_way',
    },
    {
      estimated_service_cost,
      status: 'awaiting_approval',
    },
    { new: true }
  );
  await Notification.create({
    recipient_id: service.user_id,
    recipient_model: 'User',
    title: 'Estimate Submitted',
    message: 'Please review and approve the service estimate.',
  });
  res.json({ message: 'Estimate submitted', service });
};


exports.approveEstimate = async (req, res) => {
  const { requestId } = req.params;

  const service = await ServiceRequest.findOneAndUpdate(
    {
      _id: requestId,
      user_id: req.user.id,
      status: 'awaiting_approval',
    },
    { status: 'approved' },
    { new: true }
  );

  res.json({ message: 'Estimate approved', service });
};


exports.completeService = async (req, res) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();


  const service = await ServiceRequest.findOne({
    _id: req.params.requestId,
    technician_id: req.user.id,
    status: { $in: ['approved', 'in_progress'] },
  }).populate('user_id', 'email name');

  if (!service) {
    return res.status(404).json({ message: 'Service request not found or not in valid state' });
  }


  service.completion_otp = otp;

  await service.save();


  const sendEmail = require('../utils/email');
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4F46E5;">Service Completion Verification</h2>
      <p>Hello ${service.user_id.name},</p>
      <p>Your technician has requested to mark the service as complete. Please provide the following OTP to them to verify and close the job:</p>
      <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0;">
        ${otp}
      </div>
      <p>If the job is not done to your satisfaction, please do not share this code.</p>
      <p>Thank you,<br/>ElectroCare Team</p>
    </div>
  `;

  try {
    await sendEmail(service.user_id.email, 'ElectroCare - Service Completion OTP', emailHtml);
  } catch (error) {
    console.error('Failed to send OTP email:', error);

  }

  res.json({ message: 'OTP sent to user email', otp_sent: true });
};


exports.verifyOtpAndPay = async (req, res) => {
  const { otp } = req.body;

  const service = await ServiceRequest.findById(req.params.requestId);

  if (!service || service.completion_otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  service.otp_verified = true;
  service.status = 'completed';
  service.completed_at = new Date();
  await service.save();


  await Technician.updateMany(
    { _id: service.technician_id, loyalty_points: { $exists: false } },
    { $set: { loyalty_points: 100 } }
  );

  const totalCost = service.estimated_service_cost || 0;
  const alreadyPaid = service.visit_fee_paid ? 200 : 0;
  const balanceToPay = totalCost - alreadyPaid;

  if (balanceToPay > 0) {

    await Transaction.create({
      user_id: service.user_id,
      technician_id: service.technician_id,
      amount: balanceToPay,
      type: 'debit',
      category: 'service_payment',
      description: `Balance payment for service (Total: ${totalCost}, Paid: ${alreadyPaid})`,
      status: 'success',
      related_request_id: service._id
    });
  }

  if (service.visit_fee_paid) {
    await Technician.findByIdAndUpdate(service.technician_id, {
      $inc: { wallet_balance: 150, completed_jobs: 1 }
    });

    await Transaction.create({
      technician_id: service.technician_id,
      amount: 150,
      type: 'credit',
      category: 'technician_payout',
      description: 'Earnings for completed service (Visit Fee Share)',
      status: 'success',
      related_request_id: service._id
    });
  }

  await Technician.findByIdAndUpdate(service.technician_id, {
    status: 'active',
    is_available: true,
  });

  await Notification.create({
    recipient_id: service.technician_id,
    recipient_model: 'Technician',
    title: 'Service Closed',
    message: 'Service successfully completed. ₹150 credited to wallet.',
  });

  res.json({ message: 'OTP verified, service closed, payout processed' });
};


exports.cancelByUser = async (req, res) => {
  const { requestId } = req.params;

  console.log(`[CancelByUser] Request: ${requestId}, User: ${req.user.id}`);

  const service = await ServiceRequest.findOne({
    _id: requestId,
    user_id: req.user.id,
  });

  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }


  if (['approved', 'in_progress', 'completed'].includes(service.status)) {
    return res.status(403).json({
      message: 'Cancellation not allowed at this stage. Please contact support.',
    });
  }


  if (['pending', 'broadcasted', 'accepted'].includes(service.status)) {
    if (service.used_free_visit) {
      // Restore Free Visit
      await Subscription.findOneAndUpdate(
        { user_id: req.user.id, status: 'active' },
        { $inc: { free_visits_used: -1, total_visits_used: -1 } }
      );
    }
    else if (service.visit_fee_paid) {

      await User.findByIdAndUpdate(req.user.id, { $inc: { wallet_balance: 200 } });
      await Transaction.create({
        user_id: req.user.id,
        amount: 200,
        type: 'credit',
        category: 'visit_fee_refund',
        description: 'Full refund for cancellation (Before Technician Arrival)',
        status: 'success',
        related_request_id: service._id
      });
    }
  }


  else if (service.status === 'on_the_way') {

    await User.findByIdAndUpdate(req.user.id, {
      $inc: { loyalty_points: -15 }
    });

    // Free Visit Cancellation Logic
    if (service.used_free_visit) {
      // 1. Restore Free Visit
      await Subscription.findOneAndUpdate(
        { user_id: req.user.id, status: 'active' },
        { $inc: { free_visits_used: -1, total_visits_used: -1 } }
      );

      // 2. Pay Technician 75 (Platform Fund)
      if (service.technician_id) {
        await Technician.findByIdAndUpdate(service.technician_id, { $inc: { wallet_balance: 75 } });
        await Transaction.create({
          technician_id: service.technician_id,
          amount: 75,
          type: 'credit',
          category: 'technician_payout', // Platform funded
          description: 'Compensation for cancelled Free Visit (User Cancelled On The Way)',
          status: 'success',
          related_request_id: service._id
        });
      }
    }
    // Paid Visit Logic (Existing)
    else {
      // ... (Existing penalty logic if any, currently specific penalty logic was removed/not present for user cancel other than loyalty points)
      // Wait, current code checks visit_fee_paid in other blocks but nothing here?
      // Ah, for 'on_the_way', user loses visit fee if paid? 
      // Existing code had no refund logic for 'on_the_way', meaning NO REFUND.
      // So we leave it as is.
    }
  }


  else if (service.status === 'awaiting_approval') {
    if (service.used_free_visit) {
      // Visit Consumed - Do NOT restore (User request: "only minus if user cancel the estimate")

      // Pay Technician full visit share (150) since visit marks as used
      if (service.technician_id) {
        await Technician.findByIdAndUpdate(service.technician_id, { $inc: { wallet_balance: 150 } });
        await Transaction.create({
          technician_id: service.technician_id,
          amount: 150,
          type: 'credit',
          category: 'technician_payout',
          description: 'Compensation for cancelled Free Visit (Cancelled at Estimate)',
          status: 'success',
          related_request_id: service._id
        });
      }
    }
    else if (service.visit_fee_paid) {

      await User.findByIdAndUpdate(req.user.id, { $inc: { wallet_balance: 75 } });
      await Transaction.create({
        user_id: req.user.id,
        amount: 75,
        type: 'credit',
        category: 'visit_fee_refund',
        description: 'Partial refund (Cancelled after estimate)',
        status: 'success',
        related_request_id: service._id
      });


      if (service.technician_id) {
        await Technician.findByIdAndUpdate(service.technician_id, { $inc: { wallet_balance: 100 } });
        await Transaction.create({
          technician_id: service.technician_id,
          amount: 100,
          type: 'credit',
          category: 'technician_payout',
          description: 'Compensation for cancelled service (After estimate)',
          status: 'success',
          related_request_id: service._id
        });
      }


    }
  }

  service.status = 'cancelled';
  await service.save();

  if (service.technician_id) {
    await Technician.findByIdAndUpdate(service.technician_id, {
      status: 'active',
      is_available: true,
    });

    await Notification.create({
      recipient_id: service.technician_id,
      recipient_model: 'Technician',
      title: 'Service Cancelled',
      message: 'User has cancelled the service request.',
    });
  }

  res.json({ message: 'Service cancelled successfully' });
};

exports.cancelByTechnician = async (req, res) => {
  const { requestId } = req.params;

  const service = await ServiceRequest.findOne({
    _id: requestId,
    technician_id: req.user.id,
  });

  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }


  if (['awaiting_approval', 'approved', 'in_progress', 'completed'].includes(service.status)) {
    return res.status(403).json({
      message: 'Cancellation not allowed after submitting estimate',
    });
  }

  const technician = await Technician.findById(req.user.id);


  if (typeof technician.loyalty_points !== 'number') {
    technician.loyalty_points = 100;
  }

  if (service.status === 'on_the_way') {
    technician.loyalty_points -= 15;


    if (service.visit_fee_paid) {
      await User.findByIdAndUpdate(service.user_id, { $inc: { wallet_balance: 200 } });
      await Transaction.create({
        user_id: service.user_id,
        amount: 200,
        type: 'credit',
        category: 'visit_fee_refund',
        description: 'Full refund due to technician cancellation (While On The Way)',
        status: 'success',
        related_request_id: service._id
      });
    }

    if (technician.loyalty_points < 50) {
      technician.status = 'suspended';
      technician.suspended_until = new Date(
        Date.now() + 15 * 24 * 60 * 60 * 1000
      );
    }


    service.status = 'cancelled';
    await service.save();

    await Notification.create({
      recipient_id: service.user_id,
      recipient_model: 'User',
      title: 'Technician Cancelled',
      message: 'Technician cancelled while on the way. Full refund processed.',
    });

  } else {

    service.technician_id = null;
    service.accepted_at = null;
    service.on_the_way_at = null;
    service.status = 'broadcasted';
    await service.save();


    await RequestQueue.findOneAndUpdate(
      { request_id: requestId, technician_id: req.user.id },
      { response_status: 'rejected', response_time: new Date() }
    );

    await Notification.create({
      recipient_id: service.user_id,
      recipient_model: 'User',
      title: 'Technician Cancelled',
      message: 'Technician has cancelled. Searching for a new technician...',
    });
  }


  await technician.save();


  if (technician.status !== 'suspended') {
    technician.status = 'active';
    technician.is_available = true;
    await technician.save();
  }

  return res.json({
    message: service.status === 'cancelled' ? 'Service cancelled and refunded.' : 'Service re-broadcasted.',
    loyalty_points: technician.loyalty_points,
    technician_status: technician.status,
  });
};


exports.getMyServiceRequests = async (req, res) => {
  const requests = await ServiceRequest.find({
    user_id: req.user.id,
  })
    .populate('technician_id', 'name phone rating overall_rating completed_jobs')
    .sort({ created_at: -1 });

  res.json(requests);
};


exports.getTechnicianRequests = async (req, res) => {
  try {
    const technicianId = req.user.id;


    const queueItems = await RequestQueue.find({
      technician_id: technicianId,
      response_status: 'pending'
    }).populate({
      path: 'request_id',
      populate: { path: 'user_id', select: 'name phone address loyalty_points' }
    });


    const broadcastedRequests = queueItems
      .map(item => item.request_id)
      .filter(req => req && req.status === 'broadcasted');


    const myJobs = await ServiceRequest.find({
      technician_id: technicianId
    }).populate('user_id', 'name phone address loyalty_points');


    const allRequests = [...broadcastedRequests, ...myJobs].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    res.json(allRequests);
  } catch (error) {
    console.error('Get Technician Requests Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
