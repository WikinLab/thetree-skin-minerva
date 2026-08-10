import fs from 'node:fs';
import path from 'node:path';

function normalize(value) {
  return String(value).replace(/\r\n?/g, '\n');
}

function parseDesktopDefaults(source) {
  const constants = new Map(
    [...source.matchAll(/public const\s+([A-Z0-9_]+)\s*=\s*'([^']+)'\s*;/g)]
      .map((match) => [match[1], match[2]])
  );
  const block = /private array \$skinOptions\s*=\s*\[([\s\S]*?)\n\t\];/.exec(source)?.[1];
  if (!block) throw new Error('SkinOptions.php no longer exposes the desktop skinOptions array.');
  const defaults = new Map();
  for (const match of block.matchAll(/self::([A-Z0-9_]+)\s*=>\s*(true|false)\s*,/g)) {
    const key = constants.get(match[1]);
    if (!key) throw new Error(`SkinOptions.php uses undeclared constant ${match[1]}.`);
    defaults.set(match[1], match[2] === 'true');
  }
  return defaults;
}

function mobileLayers(value, featureName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`skin.json ${featureName} must be a profile object.`);
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, !!entry]));
}

function render(profile, inputs) {
  return `/* @generated from ${inputs.join(' and ')}; do not hand-edit. */\n` +
    `export const MINERVA_FEATURE_PROFILE = Object.freeze(${JSON.stringify(profile, null, 2)});\n` +
    'export default MINERVA_FEATURE_PROFILE;\n';
}

export function generateMinervaFeatureProfile({ root, contractPath, check = false }) {
  const contract = JSON.parse(fs.readFileSync(path.join(root, contractPath), 'utf8'));
  if (contract.schema !== 1) throw new Error(`Unsupported Minerva feature profile schema ${contract.schema}.`);
  const mobileSource = JSON.parse(fs.readFileSync(path.join(root, contract.mobileInput), 'utf8'));
  const desktopSource = normalize(fs.readFileSync(path.join(root, contract.desktopInput), 'utf8'));
  const desktopDefaults = parseDesktopDefaults(desktopSource);
  const desktop = {};
  const mobile = {};
  const forceTrueWhen = {};
  for (const [name, definition] of Object.entries(contract.features || {})) {
    if (!desktopDefaults.has(definition.desktopConstant)) {
      throw new Error(`SkinOptions.php lacks ${definition.desktopConstant} for ${name}.`);
    }
    desktop[name] = desktopDefaults.get(definition.desktopConstant);
    mobile[name] = Object.hasOwn(definition, 'mobileFixed')
      ? { base: !!definition.mobileFixed }
      : mobileLayers(mobileSource.config?.[definition.mobileConfig]?.value, definition.mobileConfig);
    forceTrueWhen[name] = [...(definition.forceTrueWhen || [])];
  }
  const content = render({ schema: 1, desktop, mobile, forceTrueWhen }, [contract.desktopInput, contract.mobileInput]);
  const outputPath = path.join(root, contract.output);
  if (check) {
    if (!fs.existsSync(outputPath) || normalize(fs.readFileSync(outputPath, 'utf8')) !== normalize(content)) {
      throw new Error(`Generated Minerva feature profile is stale: ${contract.output}`);
    }
  } else {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content);
  }
  return {
    inputs: [contract.desktopInput, contract.mobileInput].sort(),
    outputs: [contract.output],
    relations: [{ path: contract.output, input: contract.mobileInput, dependencies: [contract.desktopInput] }]
  };
}
