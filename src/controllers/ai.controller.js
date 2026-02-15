const { diagnoseIssue } = require('../utils/ai');

exports.diagnose = async (req, res) => {
    try {
        const { applianceType, description } = req.body;

        if (!applianceType || !description) {
            return res.status(400).json({ message: 'Appliance type and description are required' });
        }

        const diagnosis = await diagnoseIssue(applianceType, description);

        res.json(diagnosis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
