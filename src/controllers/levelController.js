const levelConfig = getLevelConfig(Number(req.params.levelNumber));
res.json({ levelConfig });