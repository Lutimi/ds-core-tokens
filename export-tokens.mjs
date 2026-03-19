/**
 * DS CORE 2.0 — Design Token Exporter
 * Exports colors, typography and effects from Figma DS CORE 2.0
 * to a standard design-tokens JSON (compatible with Style Dictionary)
 */

const FILE_KEY = process.env.FIGMA_FILE_KEY || 'MhNYN4jPtijJD6bj6ifzDm';
const TOKEN = process.env.FIGMA_TOKEN;
const BASE_URL = 'https://api.figma.com/v1';

async function figmaGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Figma-Token': TOKEN }
  });
  if (!res.ok) throw new Error(`Figma API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function rgbToHex(r, g, b) {
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbaToHex(r, g, b, a) {
  if (a >= 1) return rgbToHex(r, g, b);
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
}

// Build nested object from path like "color/brand/primary/400"
function setNestedValue(obj, path, value) {
  const parts = path.split('/').map(p => p.trim().replace(/\s+/g, '_').toLowerCase());
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  const last = parts[parts.length - 1];
  current[last] = value;
}

const log = (...args) => process.stderr.write(args.join(' ') + '\n');

async function exportTokens() {
  log('Fetching styles from DS CORE 2.0...');
  const stylesData = await figmaGet(`/files/${FILE_KEY}/styles`);
  const styles = stylesData.meta.styles;

  const fills = styles.filter(s => s.style_type === 'FILL');
  const texts = styles.filter(s => s.style_type === 'TEXT');
  const effects = styles.filter(s => s.style_type === 'EFFECT');

  log(`Found: ${fills.length} colors, ${texts.length} text styles, ${effects.length} effects`);

  // ── COLORS ──────────────────────────────────────────────
  log('Fetching color values...');
  const colorTokens = {};
  const BATCH_SIZE = 50;

  for (let i = 0; i < fills.length; i += BATCH_SIZE) {
    const batch = fills.slice(i, i + BATCH_SIZE);
    const ids = batch.map(s => s.node_id).join(',');
    const nodesData = await figmaGet(`/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(ids)}`);

    for (const style of batch) {
      const nodeData = nodesData.nodes[style.node_id];
      if (!nodeData) continue;
      const doc = nodeData.document;
      const fills = doc.fills || [];
      const fill = fills.find(f => f.type === 'SOLID');
      if (!fill || !fill.color) continue;

      const { r, g, b, a } = fill.color;
      const hex = rgbaToHex(r, g, b, a);

      setNestedValue(colorTokens, style.name, {
        $value: hex,
        $type: 'color',
        description: style.description || ''
      });
    }
    log(`  Colors: ${Math.min(i + BATCH_SIZE, fills.length)}/${fills.length}`);
  }
  log('\nColors done.');

  // ── TYPOGRAPHY ───────────────────────────────────────────
  log('Fetching typography values...');
  const typographyTokens = {};

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const ids = batch.map(s => s.node_id).join(',');
    const nodesData = await figmaGet(`/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(ids)}`);

    for (const style of batch) {
      const nodeData = nodesData.nodes[style.node_id];
      if (!nodeData) continue;
      const doc = nodeData.document;
      const ts = doc.style || {};

      setNestedValue(typographyTokens, style.name, {
        $value: {
          fontFamily: ts.fontFamily || '',
          fontWeight: ts.fontWeight || 400,
          fontSize: ts.fontSize || 14,
          lineHeight: ts.lineHeightPx ? `${Math.round(ts.lineHeightPx)}px` : 'auto',
          letterSpacing: ts.letterSpacing || 0,
          fontStyle: ts.italic ? 'italic' : 'normal'
        },
        $type: 'typography',
        description: style.description || ''
      });
    }
    log(`  Typography: ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length}`);
  }
  log('\nTypography done.');

  // ── EFFECTS (shadows) ────────────────────────────────────
  log('Fetching effect values...');
  const effectTokens = {};

  const effectIds = effects.map(s => s.node_id).join(',');
  const effectNodes = await figmaGet(`/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(effectIds)}`);

  for (const style of effects) {
    const nodeData = effectNodes.nodes[style.node_id];
    if (!nodeData) continue;
    const doc = nodeData.document;
    const styleEffects = doc.effects || [];

    const shadows = styleEffects
      .filter(e => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW')
      .map(e => {
        const { r, g, b, a } = e.color || { r: 0, g: 0, b: 0, a: 0.25 };
        return `${e.type === 'INNER_SHADOW' ? 'inset ' : ''}${e.offset?.x || 0}px ${e.offset?.y || 0}px ${e.radius || 0}px ${e.spread || 0}px ${rgbaToHex(r, g, b, a)}`;
      });

    if (shadows.length === 0) continue;

    setNestedValue(effectTokens, style.name, {
      $value: shadows.join(', '),
      $type: 'shadow',
      description: style.description || ''
    });
  }
  log('Effects done.');

  // ── MERGE & OUTPUT ───────────────────────────────────────
  const output = {
    $metadata: {
      source: 'Figma DS CORE 2.0',
      fileKey: FILE_KEY,
      exportedAt: new Date().toISOString(),
      totalTokens: fills.length + texts.length + effects.length
    },
    color: colorTokens,
    typography: typographyTokens,
    effect: effectTokens
  };

  return output;
}

// Run
exportTokens()
  .then(tokens => {
    const json = JSON.stringify(tokens, null, 2);
    process.stdout.write(json);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
