const reportService = require('../services/reportService');

/**
 * Validate and sanitize report filters
 */
const validateFilters = (query) => {
    const filters = { ...query };

    // Pagination
    filters.page = Math.max(1, parseInt(query.page) || 1);
    filters.limit = Math.max(1, Math.min(1000, parseInt(query.limit) || 10));

    // Date Validation
    if (filters.startDate && isNaN(Date.parse(filters.startDate))) {
        delete filters.startDate;
    }
    if (filters.endDate && isNaN(Date.parse(filters.endDate))) {
        delete filters.endDate;
    }

    // Amount Range Validation
    if (filters.minAmount) filters.minAmount = parseFloat(filters.minAmount) || 0;
    if (filters.maxAmount) filters.maxAmount = parseFloat(filters.maxAmount) || Infinity;

    return filters;
};

/**
 * Get Revenue Report Controller
 */
exports.getRevenueReport = async (req, res) => {
    try {
        const filters = validateFilters(req.query);
        const report = await reportService.getRevenueReport(filters);
        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Get User Roster Report Controller
 */
exports.getUserRosterReport = async (req, res) => {
    try {
        const filters = validateFilters(req.query);
        const report = await reportService.getUserRosterReport(filters);
        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Get Technician Performance Report Controller
 */
exports.getTechnicianPerformanceReport = async (req, res) => {
    try {
        const filters = validateFilters(req.query);
        const report = await reportService.getTechnicianPerformanceReport(filters);
        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
