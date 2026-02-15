const { User, Technician, ServiceRequest, Transaction, Payment, Appliance } = require('../models');


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
    const technician = await Technician.findById(id);
    if (!technician) return res.status(404).json({ message: 'Technician not found' });

    technician.isVerified = true;
    await technician.save();

    res.json({ message: 'Technician verified successfully' });
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
    const { type } = req.query; 

    if (type === 'users') {
      const data = await User.find().select('name email phone wallet_balance createdAt isVerified loyalty_points');
      return res.json(data);
    }

    if (type === 'technicians') {
      const data = await Technician.find().select('name email phone skills isVerified rating completed_jobs wallet_balance');
      return res.json(data);
    }

    if (type === 'revenue') {
      const payments = await Payment.find({ status: 'success' }).populate('user_id', 'name').sort({ createdAt: -1 });
      const subs = await Transaction.find({ category: 'subscription_purchase', status: 'success' }).populate('user_id', 'name').sort({ createdAt: -1 });

      // Combine and format
      const revenueData = [
        ...payments.map(p => ({
          date: p.createdAt,
          type: 'Visit Fee',
          amount: p.amount,
          platform_share: p.platform_share,
          user: p.user_id?.name || 'Unknown'
        })),
        ...subs.map(s => ({
          date: s.createdAt,
          type: 'Subscription',
          amount: s.amount,
          platform_share: s.amount, // Full amount is revenue
          user: s.user_id?.name || 'Unknown'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

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