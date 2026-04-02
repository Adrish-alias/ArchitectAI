const API_URL = 'http://localhost:5000/generate';
const ANALYSE_URL = 'http://localhost:5000/analyse';

export async function generateArchitecture({ idea, users, budget, features, tier = 'balanced' }) {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea, users, budget: budget || undefined, features, tier }),
  });
  const json = await resp.json();
  if (!json.success) {
    throw new Error(json.message || json.error || 'Generation failed');
  }
  return json.data;
}

export async function generateAllTiers(params, onProgress) {
  const tiers = ['cost', 'balanced', 'performance'];
  const results = {};

  const promises = tiers.map(async (tier) => {
    try {
      const data = await generateArchitecture({ ...params, tier });
      results[tier] = { success: true, data };
      if (onProgress) onProgress(tier, results[tier]);
    } catch (err) {
      results[tier] = { success: false, error: err.message };
      if (onProgress) onProgress(tier, results[tier]);
    }
  });

  await Promise.allSettled(promises);
  return results;
}

export async function analyseArchitecture({ mermaid, description }) {
  const resp = await fetch(ANALYSE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mermaid, description }),
  });
  const json = await resp.json();
  if (!json.success) {
    throw new Error(json.message || json.error || 'Analysis failed');
  }
  return json.data;
}