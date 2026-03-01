const { User, Technician, ServiceRequest, Transaction, Payment } = require('../models');
const mongoose = require('mongoose');

/**
 * Get Revenue Report
 * Aggregates revenue from subscriptions and service visit fees.
 */
exports.getRevenueReport = async (filters) => {
    const { startDate, endDate, transactionType, paymentStatus, paymentMethod, minAmount, maxAmount, search, subscriptionPlan, city, sortBy = 'date', order = 'DESC' } = filters;

    const match = { status: 'success' };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            match.createdAt.$lte = end;
        }
    }

    if (paymentStatus) match.status = paymentStatus;
    // Add more transaction-specific matches if needed

    const pipeline = [
        { $match: match },
        // For revenue, we might need to join with Users for search and city
        {
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
    ];

    // Search and City filters
    if (search) {
        pipeline.push({
            $match: {
                $or: [
                    { 'user.name': { $regex: search, $options: 'i' } },
                    { 'user.email': { $regex: search, $options: 'i' } }
                ]
            }
        });
    }

    if (city) {
        pipeline.push({ $match: { 'user.address': { $regex: city, $options: 'i' } } });
    }

    if (transactionType) {
        // Map transactionType to category if necessary
        pipeline.push({ $match: { category: transactionType } });
    }

    if (minAmount || maxAmount) {
        const amountMatch = {};
        if (minAmount) amountMatch.$gte = Number(minAmount);
        if (maxAmount) amountMatch.$lte = Number(maxAmount);
        pipeline.push({ $match: { amount: amountMatch } });
    }

    // Projection
    pipeline.push({
        $project: {
            date: '$createdAt',
            user: '$user.name',
            email: '$user.email',
            type: '$category',
            amount: 1,
            platform_share: {
                $cond: {
                    if: { $eq: ['$category', 'subscription_purchase'] },
                    then: '$amount',
                    else: 50 // Default share for visit fees if not explicitly in payment model
                }
            },
            status: 1
        }
    });

    const sortDir = order === 'ASC' ? 1 : -1;
    pipeline.push({ $sort: { [sortBy === 'date' ? 'date' : sortBy]: sortDir } });

    // Use $facet for pagination and totals
    const finalPipeline = [
        ...pipeline,
        {
            $facet: {
                data: [{ $skip: (filters.page - 1) * filters.limit }, { $limit: Number(filters.limit) }],
                totalCount: [{ $count: 'count' }],
                totals: [
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$amount' },
                            totalPlatformShare: { $sum: '$platform_share' }
                        }
                    }
                ]
            }
        }
    ];

    const result = await Transaction.aggregate(finalPipeline);
    const data = result[0].data;
    const totalCount = result[0].totalCount[0]?.count || 0;
    const stats = result[0].totals[0] || { totalRevenue: 0, totalPlatformShare: 0 };

    return { data, totalCount, ...stats };
};

/**
 * Get User Roster Report
 */
exports.getUserRosterReport = async (filters) => {
    const { startDate, endDate, verificationStatus, minWallet, maxWallet, minPoints, maxPoints, subscriptionStatus, lastLogin, city, search, sortBy = 'createdAt', order = 'DESC' } = filters;

    const match = {};
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            match.createdAt.$lte = end;
        }
    }

    if (verificationStatus !== undefined) match.isVerified = verificationStatus === 'true';
    if (city) match.address = { $regex: city, $options: 'i' };
    if (search) {
        match.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    if (minWallet || maxWallet) {
        match.wallet_balance = {};
        if (minWallet) match.wallet_balance.$gte = Number(minWallet);
        if (maxWallet) match.wallet_balance.$lte = Number(maxWallet);
    }

    if (minPoints || maxPoints) {
        match.loyalty_points = {};
        if (minPoints) match.loyalty_points.$gte = Number(minPoints);
        if (maxPoints) match.loyalty_points.$lte = Number(maxPoints);
    }

    const pipeline = [
        { $match: match },
        // Compute subscription status (Simplified: checking if they have a 'subscription_purchase' success transaction)
        {
            $lookup: {
                from: 'transactions',
                let: { userId: '$_id' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$user_id', '$$userId'] }, { $eq: ['$category', 'subscription_purchase'] }, { $eq: ['$status', 'success'] }] } } },
                    { $sort: { createdAt: -1 } },
                    { $limit: 1 }
                ],
                as: 'lastSub'
            }
        },
        { $unwind: { path: '$lastSub', preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                subStatus: {
                    $cond: {
                        if: { $gt: ['$lastSub.createdAt', new Date(new Date().setDate(new Date().getDate() - 30))] }, // Dynamic active check (example 30 days)
                        then: 'Active',
                        else: { $cond: { if: '$lastSub', then: 'Expired', else: 'None' } }
                    }
                }
            }
        }
    ];

    if (subscriptionStatus && subscriptionStatus !== 'all') {
        pipeline.push({ $match: { subStatus: subscriptionStatus } });
    }

    const sortDir = order === 'ASC' ? 1 : -1;
    pipeline.push({ $sort: { [sortBy]: sortDir } });

    const finalPipeline = [
        ...pipeline,
        {
            $facet: {
                data: [{ $skip: (filters.page - 1) * filters.limit }, { $limit: Number(filters.limit) }],
                totalCount: [{ $count: 'count' }]
            }
        }
    ];

    const result = await User.aggregate(finalPipeline);
    return {
        data: result[0].data,
        totalCount: result[0].totalCount[0]?.count || 0
    };
};

/**
 * Get Technician Performance Report
 */
exports.getTechnicianPerformanceReport = async (filters) => {
    const { startDate, endDate, verificationStatus, minRating, maxRating, minJobs, maxJobs, skills, city, availability, minEarnings, maxEarnings, sortBy = 'rating', order = 'DESC' } = filters;

    const match = {};
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            match.createdAt.$lte = end;
        }
    }

    if (verificationStatus) match.verificationStatus = verificationStatus;
    if (city) match.pincode = { $regex: city, $options: 'i' }; // Or address if exists
    if (availability) match.status = availability;
    if (skills && skills.length > 0) match.skills = { $all: Array.isArray(skills) ? skills : [skills] };

    if (minRating || maxRating) {
        match.rating = {};
        if (minRating) match.rating.$gte = Number(minRating);
        if (maxRating) match.rating.$lte = Number(maxRating);
    }

    if (minJobs || maxJobs) {
        match.completed_jobs = {};
        if (minJobs) match.completed_jobs.$gte = Number(minJobs);
        if (maxJobs) match.completed_jobs.$lte = Number(maxJobs);
    }

    const pipeline = [
        { $match: match },
        // Compute earnings (Simplified: sum of success technician_payout category)
        {
            $lookup: {
                from: 'transactions',
                let: { techId: '$_id' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$technician_id', '$$techId'] }, { $eq: ['$category', 'technician_payout'] }, { $eq: ['$status', 'success'] }] } } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ],
                as: 'earningsInfo'
            }
        },
        { $unwind: { path: '$earningsInfo', preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                totalEarnings: { $ifNull: ['$earningsInfo.total', 0] }
            }
        }
    ];

    if (minEarnings || maxEarnings) {
        const earningsMatch = {};
        if (minEarnings) earningsMatch.$gte = Number(minEarnings);
        if (maxEarnings) earningsMatch.$lte = Number(maxEarnings);
        pipeline.push({ $match: { totalEarnings: earningsMatch } });
    }

    const sortDir = order === 'ASC' ? 1 : -1;
    pipeline.push({ $sort: { [sortBy === 'rating' ? 'rating' : sortBy]: sortDir } });

    const finalPipeline = [
        ...pipeline,
        {
            $facet: {
                data: [{ $skip: (filters.page - 1) * filters.limit }, { $limit: Number(filters.limit) }],
                totalCount: [{ $count: 'count' }],
                stats: [
                    {
                        $group: {
                            _id: null,
                            avgRating: { $avg: '$rating' },
                            totalRevenue: { $sum: '$totalEarnings' },
                            totalJobs: { $sum: '$completed_jobs' }
                        }
                    }
                ]
            }
        }
    ];

    const result = await Technician.aggregate(finalPipeline);
    return {
        data: result[0].data,
        totalCount: result[0].totalCount[0]?.count || 0,
        stats: result[0].stats[0] || { avgRating: 0, totalRevenue: 0, totalJobs: 0 }
    };
};
