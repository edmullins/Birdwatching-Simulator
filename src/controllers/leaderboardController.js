import User from '../models/user.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// GET /api/leaderboard?limit=N
// Top N players by stats.maxLevelReached, descending, with a stable
// tiebreak on username so pagination/ordering doesn't shuffle between
// requests when scores are equal.
export async function getLeaderboard(req, res) {
  try {
    const requestedLimit = parseInt(req.query.limit, 10);
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const topUsers = await User.find({})
      .sort({ 'stats.maxLevelReached': -1, username: 1 })
      .limit(limit)
      .select('username stats.maxLevelReached')
      .lean();

    const entries = topUsers.map((u, index) => ({
      rank: index + 1,
      username: u.username,
      maxLevelReached: u.stats?.maxLevelReached ?? 0,
    }));

    // The current player's own rank, even when they're outside the top
    // N — computed by counting how many players sort strictly above
    // them under the same order (higher level, or equal level with an
    // earlier username). Lets the client always show "you" without a
    // second round trip or a client-side guess.
    const me = await User.findById(req.session.userId).select('username stats.maxLevelReached').lean();

    let you = null;
    if (me) {
      const myLevel = me.stats?.maxLevelReached ?? 0;
      const rankedAbove = await User.countDocuments({
        $or: [
          { 'stats.maxLevelReached': { $gt: myLevel } },
          { 'stats.maxLevelReached': myLevel, username: { $lt: me.username } },
        ],
      });
      you = { rank: rankedAbove + 1, username: me.username, maxLevelReached: myLevel };
    }

    res.status(200).json({ entries, you });
  } catch (error) {
    console.error('getLeaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}