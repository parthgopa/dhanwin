/**
 * Player Consistency & Daily Retention Telemetry Helper
 */

// Helper to get formatted YYYY-MM-DD for any date offset
export const getDateString = (date = new Date()) => {
  return new Date(date).toISOString().slice(0, 10);
};

export const getPastDaysArray = (daysCount = 7) => {
  const days = [];
  const now = new Date();
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.push({
      date: d.toISOString().slice(0, 10),
      dayName: dayNames[d.getDay()],
      dayNumber: d.getDate(),
    });
  }
  return days;
};

/**
 * Records daily visit/activity for a user and updates consecutive streak
 */
export const recordUserActivity = async (user) => {
  if (!user) return;
  try {
    const today = getDateString();
    const yesterday = getDateString(new Date(Date.now() - 86400000));
    
    if (!Array.isArray(user.activeDays)) {
      user.activeDays = [];
    }

    user.lastActiveAt = new Date();

    if (!user.activeDays.includes(today)) {
      // Calculate consecutive streak
      if (user.activeDays.includes(yesterday)) {
        user.loginStreak = (user.loginStreak || 0) + 1;
      } else {
        user.loginStreak = 1;
      }

      if ((user.loginStreak || 1) > (user.maxLoginStreak || 1)) {
        user.maxLoginStreak = user.loginStreak;
      }

      user.activeDays.push(today);

      // Keep array within last 60 days to keep document size light
      if (user.activeDays.length > 60) {
        user.activeDays = user.activeDays.slice(-60);
      }

      await user.save();
    }
  } catch (err) {
    console.warn('[Record User Activity Error]', err?.message);
  }
};

/**
 * Computes deep consistency telemetry for a single user
 * @param {Object} user - User document
 * @param {Set<string>} fallbackActiveDates - Optional set of dates from bets/txs for historical synthesis
 */
export const computeUserConsistency = (user, fallbackActiveDates = null) => {
  const activeSet = new Set(user?.activeDays || []);
  
  if (fallbackActiveDates && fallbackActiveDates.size > 0) {
    fallbackActiveDates.forEach((d) => activeSet.add(d));
  }

  // Also count user creation date as active
  if (user?.createdAt) {
    activeSet.add(getDateString(user.createdAt));
  }
  // Count lastDailyRewardClaim as active
  if (user?.lastDailyRewardClaim) {
    activeSet.add(getDateString(user.lastDailyRewardClaim));
  }

  const past7Days = getPastDaysArray(7);
  const past14Days = getPastDaysArray(14);
  const past30Days = getPastDaysArray(30);

  const activeDays7d = past7Days.filter((d) => activeSet.has(d.date)).length;
  const activeDays14d = past14Days.filter((d) => activeSet.has(d.date)).length;
  const activeDays30d = past30Days.filter((d) => activeSet.has(d.date)).length;

  const consistencyScore7d = Math.round((activeDays7d / 7) * 100);
  const consistencyScore30d = Math.round((activeDays30d / 30) * 100);

  // Classify Loyalty Tier
  let loyaltyTier = 'DORMANT';
  let tierLabel = 'Churn Risk (0d)';
  let tierColor = 'text-red-400 border-red-500/30 bg-red-500/10';
  let tierBadge = '💤 Dormant';

  if (activeDays7d >= 5) {
    loyaltyTier = 'DAILY_VIP';
    tierLabel = `Daily VIP (${activeDays7d}/7d)`;
    tierColor = 'text-amber-300 border-amber-500/40 bg-amber-500/15';
    tierBadge = '👑 Daily VIP';
  } else if (activeDays7d >= 3) {
    loyaltyTier = 'FREQUENT';
    tierLabel = `Frequent (${activeDays7d}/7d)`;
    tierColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15';
    tierBadge = '⚡ Frequent';
  } else if (activeDays7d >= 1) {
    loyaltyTier = 'OCCASIONAL';
    tierLabel = `Occasional (${activeDays7d}/7d)`;
    tierColor = 'text-blue-400 border-blue-500/40 bg-blue-500/15';
    tierBadge = '🎲 Occasional';
  }

  const matrix7d = past7Days.map((d) => ({
    date: d.date,
    dayName: d.dayName,
    dayNumber: d.dayNumber,
    isActive: activeSet.has(d.date),
  }));

  const matrix14d = past14Days.map((d) => ({
    date: d.date,
    dayName: d.dayName,
    dayNumber: d.dayNumber,
    isActive: activeSet.has(d.date),
  }));

  return {
    lastActiveAt: user?.lastActiveAt || user?.updatedAt || user?.createdAt,
    loginStreak: user?.loginStreak || (activeDays7d > 0 ? activeDays7d : 1),
    maxLoginStreak: user?.maxLoginStreak || Math.max(user?.loginStreak || 1, activeDays7d),
    activeDays7d,
    consistencyScore7d,
    activeDays14d,
    activeDays30d,
    consistencyScore30d,
    loyaltyTier,
    tierLabel,
    tierBadge,
    tierColor,
    matrix7d,
    matrix14d,
    totalActiveDaysRecorded: activeSet.size,
  };
};

/**
 * Computes platform-wide retention and consistency aggregate
 */
export const computePlatformConsistencySummary = (usersWithConsistency) => {
  const totalUsers = usersWithConsistency.length;
  if (totalUsers === 0) {
    return {
      dauToday: 0,
      wauLast7d: 0,
      stickinessRatio: 0,
      avg7dConsistency: 0,
      tierBreakdown: { dailyVip: 0, frequent: 0, occasional: 0, dormant: 0 },
    };
  }

  const today = getDateString();
  let dauToday = 0;
  let wauLast7d = 0;
  let dailyVipCount = 0;
  let frequentCount = 0;
  let occasionalCount = 0;
  let dormantCount = 0;
  let totalScore7dSum = 0;

  usersWithConsistency.forEach((u) => {
    const c = u.consistency;
    if (!c) return;

    if (c.matrix7d?.[c.matrix7d.length - 1]?.isActive) {
      dauToday++;
    }
    if (c.activeDays7d > 0) {
      wauLast7d++;
    }

    totalScore7dSum += c.consistencyScore7d || 0;

    if (c.loyaltyTier === 'DAILY_VIP') dailyVipCount++;
    else if (c.loyaltyTier === 'FREQUENT') frequentCount++;
    else if (c.loyaltyTier === 'OCCASIONAL') occasionalCount++;
    else dormantCount++;
  });

  const stickinessRatio = wauLast7d > 0 ? Number(((dauToday / wauLast7d) * 100).toFixed(1)) : 0;
  const avg7dConsistency = Number((totalScore7dSum / totalUsers).toFixed(1));

  return {
    dauToday,
    wauLast7d,
    totalUsers,
    stickinessRatio, // DAU/WAU in %
    avg7dConsistency, // Average 7-day consistency %
    tierBreakdown: {
      dailyVip: dailyVipCount,
      frequent: frequentCount,
      occasional: occasionalCount,
      dormant: dormantCount,
    },
  };
};
