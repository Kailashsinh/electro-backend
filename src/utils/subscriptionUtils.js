exports.isFreeVisitAllowed = (subscription) => {
    if (!subscription) return false;
  
    if (subscription.plan === 'premium') {
      return subscription.free_visits_used < 2;
    }
  
    if (subscription.plan === 'premium_pro') {
      // Every 3 visits → 1 free
      return subscription.total_visits_used % 3 === 0;
    }
  
    return false;
  };  