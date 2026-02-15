/**
 * Generate a 6-digit numeric OTP
 * @returns {string}
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  
  /**
   * Get OTP expiry time (default: 5 minutes)
   * @param {number} minutes
   * @returns {Date}
   */
  const getOtpExpiry = (minutes = 5) => {
    return new Date(Date.now() + minutes * 60 * 1000);
  };
  
  module.exports = {
    generateOtp,
    getOtpExpiry,
  };  