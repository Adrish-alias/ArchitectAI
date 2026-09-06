const API_URL = 'http://localhost:5000/generate';
const ANALYSE_URL = 'http://localhost:5000/analyse';

export async function generateArchitecture({ idea, users, budget, features }) {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea, users, budget: budget || undefined, features }),
  });
  const json = await resp.json();
  if (!json.success) {
    throw new Error(json.message || json.error || 'Generation failed');
  }
  return json.architecture;
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