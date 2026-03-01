const { User, Technician, ServiceRequest, Transaction, Payment, Appliance } = require('../models');
const { decrypt } = require('../utils/crypto');


exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTechnicians = await Technician.countDocuments();
    const activeRequests = await ServiceRequest.countDocuments({
      status: { $in: ['broadcasted', 'accepted', 'on_the_way', 'in_progress', 'awaiting_approval', 'approved'] }
    });


    const transactions = await Transaction.find({ status: 'success' });
    let totalRevenue = 0;

    transactions.forEach(t => {
      if (t.category === 'subscription_purchase') {
        totalRevenue += t.amount;
      } else if (t.category === 'visit_fee_payment') {

      }
    });


    const Payment = require('../models/Payment');
    const paymentRevenue = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$platform_share' } } }
    ]);
    const visitFeeRevenue = paymentRevenue[0]?.total || 0;


    const subRevenue = await Transaction.aggregate([
      { $match: { category: 'subscription_purchase', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const subscriptionRevenue = subRevenue[0]?.total || 0;

    totalRevenue = visitFeeRevenue + subscriptionRevenue;

    res.json({
      totalUsers,
      totalTechnicians,
      activeRequests,
      totalRevenue
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getAllTechnicians = async (req, res) => {
  try {
    const technicians = await Technician.find().select('-password').sort({ createdAt: -1 });
    res.json(technicians);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const technician = await Technician.findById(id);
    if (!technician) return res.status(404).json({ message: 'Technician not found' });

    technician.verificationStatus = status;

    if (status === 'rejected') {
      technician.documents.rejection_reason = rejection_reason || 'Documents rejected';
    } else if (status === 'approved') {
      technician.documents.rejection_reason = "";
    }

    await technician.save();

    res.json({ message: `Technician ${status} successfully`, technician });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getAllServiceRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate('user_id', 'name email phone')
      .populate('technician_id', 'name phone')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getReportData = async (req, res) => {
  try {
    const { type, startDate, endDate, status } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (type === 'users') {
      if (status === 'verified') query.isVerified = true;
      if (status === 'unverified') query.isVerified = false;
      const data = await User.find(query).select('name email phone wallet_balance createdAt isVerified loyalty_points');
      return res.json(data);
    }

    if (type === 'technicians') {
      if (status === 'verified') query.isVerified = true;
      if (status === 'unverified') query.isVerified = false;
      const data = await Technician.find(query).select('name email phone skills isVerified rating completed_jobs wallet_balance');
      return res.json(data);
    }

    if (type === 'revenue') {
      const transactionQuery = { category: 'subscription_purchase', status: 'success' };
      const requestQuery = { status: 'completed' };

      if (startDate || endDate) {
        transactionQuery.createdAt = {};
        requestQuery.completed_at = {};
        if (startDate) {
          const start = new Date(startDate);
          transactionQuery.createdAt.$gte = start;
          requestQuery.completed_at.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          transactionQuery.createdAt.$lte = end;
          requestQuery.completed_at.$lte = end;
        }
      }

      const subs = await Transaction.find(transactionQuery).populate('user_id', 'name').sort({ createdAt: -1 });
      const requests = await ServiceRequest.find({
        ...requestQuery,
        status: { $in: ['completed', 'cancelled'] }
      }).populate('user_id', 'name').sort({ updatedAt: -1 });

      const revenueData = [
        ...subs.map(s => ({
          date: s.createdAt,
          type: 'Subscription',
          amount: s.amount,
          platform_share: s.amount,
          user: s.user_id?.name || 'Unknown'
        })),
        ...requests.map(req => {
          let share = 0;
          let label = req.status === 'completed' ? 'Visit Fee Share' : 'Cancellation Share';

          if (req.status === 'completed') {
            share = req.used_free_visit ? 0 : 50;
          } else if (req.status === 'cancelled') {
            // We only take share if the visit fee was paid and it reached a taxable stage
            if (req.visit_fee_paid && !req.used_free_visit) {
              // Based on logic: 
              // 1. Cancelled on the way = No refund (Platform keeps total 200)
              // 2. Cancelled at estimate = ₹50 platform share (requested)
              share = req.estimated_service_cost ? 50 : 200;
            }
          }

          return {
            date: req.status === 'completed' ? req.completed_at : req.updatedAt,
            type: req.used_free_visit ? `Free Visit (${req.status})` : label,
            amount: (req.status === 'cancelled' && !req.visit_fee_paid) ? 0 : 200,
            platform_share: share,
            user: req.user_id?.name || 'Unknown'
          };
        })
      ].filter(item => item.platform_share > 0)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return res.json(revenueData);
    }

    res.status(400).json({ message: 'Invalid report type' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;


    delete updates.password;

    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.password;

    const tech = await Technician.findByIdAndUpdate(id, updates, { new: true });
    if (!tech) return res.status(404).json({ message: 'Technician not found' });
    res.json(tech);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.deleteTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const tech = await Technician.findByIdAndDelete(id);
    if (!tech) return res.status(404).json({ message: 'Technician not found' });
    res.json({ message: 'Technician deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.deleteServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ServiceRequest.findByIdAndDelete(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json({ message: 'Request deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getAllAppliances = async (req, res) => {
  try {
    const appliances = await Appliance.find()
      .populate('user', 'name email phone')
      .populate({
        path: 'model',
        populate: {
          path: 'brand_id',
          populate: { path: 'category_id' }
        }
      })
      .sort({ createdAt: -1 });
    res.json(appliances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAppliance = async (req, res) => {
  try {
    const { id } = req.params;
    const appliance = await Appliance.findByIdAndDelete(id);
    if (!appliance) return res.status(404).json({ message: 'Appliance not found' });
    res.json({ message: 'Appliance deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTechnicianPayouts = async (req, res) => {
  try {
    const technicians = await Technician.find({
      'payment_details.method': { $ne: 'none' }
    }).select('name email phone payment_details wallet_balance');

    const payouts = technicians.map(tech => {
      const details = tech.payment_details;
      const formatted = {
        _id: tech._id,
        name: tech.name,
        email: tech.email,
        phone: tech.phone,
        wallet_balance: tech.wallet_balance || 0,
        method: details.method,
        is_verified: details.is_verified,
        bank: details.method === 'bank' ? {
          bank_name: details.bank.bank_name,
          account_number: decrypt(details.bank.account_number),
          ifsc_code: decrypt(details.bank.ifsc_code),
          account_holder: decrypt(details.bank.account_holder)
        } : null,
        upi: details.method === 'upi' ? {
          upi_id: decrypt(details.upi.upi_id)
        } : null
      };
      return formatted;
    });

    res.json(payouts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
