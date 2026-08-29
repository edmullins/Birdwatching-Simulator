// Pure CRUD — no anti-cheat, no scoring
export async function createRun(req, res) {
  const { levelNumber } = req.body;
  const config = await getLevelConfigOrFallback(levelNumber);
  const run = await Run.create({
    userId: req.session.userId,
    startedAt: new Date(),
    levelReached: levelNumber,
    levelTimestamps: [{ level: levelNumber, enteredAt: new Date() }],
    status: 'in_progress', // add this to your schema if not present
  });
  res.status(201).json({ run, levelConfig: config });
}

// Action — validation + scoring live in services/, not here
export async function completeRun(req, res) {
  const { runId } = req.params;
  const { birdsFound, levelTimestamps } = req.body;
  const run = await Run.findOne({ _id: runId, userId: req.session.userId });
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const result = await validateAndScoreRun(run, { birdsFound, levelTimestamps }); // antiCheat.js
  Object.assign(run, result, { endedAt: new Date() });
  await run.save();

  res.json({ run, summary: result.summary });
}