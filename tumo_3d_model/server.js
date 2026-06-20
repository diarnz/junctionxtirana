const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

function loadEnv() {
  const envPath = path.join(ROOT, '..', '.env');
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  });
  return env;
}

const ENV = loadEnv();
const OPENROUTER_KEY = ENV.OPENROUTER_API_KEY;
const AI_MODEL = (ENV.AI_IMAGE_GENERATION_MODEL || '').replace(/freeS$/i, 'free');

const ROOM_PURPOSES = {
  'orange box': 'collaborative creative technology lab with workstation clusters and presentation area',
  'lime green box': 'flexible classroom with grouped tables for team learning',
  'dark green box': 'audio/video production studio with editing stations and recording gear',
  'red box': 'small meeting room with central table and seating for discussions',
  'blue box': 'coding workstation room with paired desks and monitors',
  'purple box': 'media cinema lounge with screen and tiered seating',
  'floating green box': 'casual lounge with scattered tables and relaxed seating'
};

function describeLayout(items) {
  if (!items?.length) return 'Empty room with no furniture placed.';
  return items.map(it =>
    `${it.label} at position (${it.x?.toFixed(1)}, ${it.z?.toFixed(1)}m)`
  ).join('; ');
}

function buildAlternativeLayouts(room, items) {
  const count = items?.length || 0;
  const name = (room.name || '').toLowerCase();
  const alts = [];

  if (name.includes('orange') || name.includes('blue')) {
    alts.push('Workstation pairs along walls with a clear walkway through the center');
    alts.push('Four desk clusters in quadrants facing inward for collaboration');
  } else if (name.includes('purple')) {
    alts.push('Screen on front wall with rows of chairs facing the display');
    alts.push('Semicircle seating focused on a central presentation wall');
  } else if (name.includes('red')) {
    alts.push('Central meeting table with chairs evenly spaced around all sides');
  } else {
    alts.push('Balanced furniture along walls leaving open floor space in the center');
    alts.push('Grouped furniture clusters with clear paths between zones');
  }

  if (count === 0) {
    alts.push('Minimal open floor plan ready for flexible furniture arrangement');
  }

  return alts;
}

function buildQuery(room) {
  const key = Object.keys(ROOM_PURPOSES).find(k => (room.name || '').toLowerCase().includes(k));
  const purpose = key ? ROOM_PURPOSES[key] : 'multipurpose creative learning space';
  return `Best top-down floor plan layout for a ${purpose} (${room.w}m × ${room.d}m room)`;
}

app.use(express.json({ limit: '12mb' }));
app.use(express.static(ROOT));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(OPENROUTER_KEY && AI_MODEL), api: 'rerank' });
});

app.post('/api/floor-plan', async (req, res) => {
  if (!OPENROUTER_KEY || !AI_MODEL) {
    return res.status(503).json({ error: 'OpenRouter not configured in .env' });
  }

  const { image, room, items } = req.body || {};
  if (!room) {
    return res.status(400).json({ error: 'Missing room data' });
  }

  const currentDesc = describeLayout(items);
  const alternatives = buildAlternativeLayouts(room, items);
  const query = buildQuery(room);

  const documents = [
    {
      text: `Your current layout: ${currentDesc}`,
      ...(image ? { image } : {})
    },
    ...alternatives.map(alt => ({ text: alt }))
  ];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `http://localhost:${PORT}`,
        'X-Title': 'TUMO 3D Floor Plan'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        query,
        documents,
        top_n: documents.length
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || data?.error || `OpenRouter error ${response.status}`;
      console.error('OpenRouter rerank error:', msg, data);
      return res.status(502).json({ error: msg });
    }

    const results = data.results || [];
    const yours = results.find(r => r.index === 0);
    const top = results[0];
    const yourRank = results.findIndex(r => r.index === 0) + 1;
    const yourScore = yours?.relevance_score ?? 0;
    const topScore = top?.relevance_score ?? 0;
    const isYoursBest = top?.index === 0;

    let caption;
    let description;

    if (!items?.length) {
      caption = 'Empty room — ready to furnish';
      description = 'Place furniture in 3D, then view this plan again. The AI will score how well your layout fits the room purpose.';
    } else if (isYoursBest) {
      caption = `Your layout is the best match (${(yourScore * 100).toFixed(0)}% relevance)`;
      description = `The AI ranked your current floor plan #1 for this ${room.name}. ${currentDesc}. This arrangement fits the room purpose well with clear circulation and purposeful zones.`;
    } else {
      const topText = top?.document?.text || 'Alternative layout';
      caption = `Your layout ranked #${yourRank} — see suggestion below`;
      description = `Your layout: ${currentDesc}. Top suggestion: ${topText.replace(/^Your current layout: /, '')}. Consider adjusting furniture toward the higher-ranked arrangement for better flow.`;
    }

    res.json({
      caption,
      description,
      yourScore,
      topScore,
      yourRank,
      isYoursBest,
      rankings: results.map(r => ({
        text: r.document?.text || '',
        score: r.relevance_score,
        isYours: r.index === 0
      }))
    });
  } catch (err) {
    console.error('Floor plan AI error:', err);
    res.status(500).json({ error: err.message || 'AI request failed' });
  }
});

app.listen(PORT, () => {
  console.log(`TUMO 3D server → http://localhost:${PORT}`);
  console.log(`AI model (rerank): ${AI_MODEL || '(not set)'}`);
  console.log(`OpenRouter: ${OPENROUTER_KEY ? 'configured' : 'missing'}`);
});
