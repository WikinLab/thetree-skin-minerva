const DEFAULT_OPEN = '{{';
const DEFAULT_CLOSE = '}}';

function isObjectLike(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

function isFalseySectionValue(value) {
  return value === false || value === null || value === undefined ||
    (Array.isArray(value) && value.length === 0);
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitDottedName(name) {
  return name === '.' ? ['.'] : String(name).split('.');
}

function lookupInContext(context, name) {
  if (name === '.') return { found: true, value: context };
  if (!isObjectLike(context)) return { found: false, value: undefined };

  const parts = splitDottedName(name);
  let current = context;
  for (const part of parts) {
    if (!isObjectLike(current) || !(part in current)) {
      return { found: false, value: undefined };
    }
    current = current[part];
  }
  return { found: true, value: current };
}

export function lookupMustacheValue(contextStack, name) {
  for (let index = contextStack.length - 1; index >= 0; index -= 1) {
    const result = lookupInContext(contextStack[index], name);
    if (result.found) return result.value;
  }
  return undefined;
}

function parseTag(rawTag) {
  const trimmed = rawTag.trim();
  if (!trimmed) return { type: 'variable', name: '' };

  const marker = trimmed[0];
  if (marker === '!') return { type: 'comment' };
  if (marker === '#') return { type: 'section', name: trimmed.slice(1).trim() };
  if (marker === '^') return { type: 'inverted', name: trimmed.slice(1).trim() };
  if (marker === '/') return { type: 'close', name: trimmed.slice(1).trim() };
  if (marker === '>') return { type: 'partial', name: trimmed.slice(1).trim() };
  if (marker === '&') return { type: 'unescaped', name: trimmed.slice(1).trim() };
  if (marker === '=') return { type: 'delimiter', value: trimmed };
  return { type: 'variable', name: trimmed };
}

function appendText(container, value) {
  if (!value) return;
  const previous = container[container.length - 1];
  if (previous && previous.type === 'text') previous.value += value;
  else container.push({ type: 'text', value });
}

export function parseMustache(source, { sourceName = '<mustache>' } = {}) {
  const root = [];
  const stack = [{ name: null, children: root }];
  let current = root;
  let open = DEFAULT_OPEN;
  let close = DEFAULT_CLOSE;
  let cursor = 0;

  while (cursor < source.length) {
    const openIndex = source.indexOf(open, cursor);
    if (openIndex < 0) {
      appendText(current, source.slice(cursor));
      break;
    }

    appendText(current, source.slice(cursor, openIndex));

    const isTriple = open === DEFAULT_OPEN && source.startsWith('{{{', openIndex);
    const activeOpen = isTriple ? '{{{' : open;
    const activeClose = isTriple ? '}}}' : close;
    const contentStart = openIndex + activeOpen.length;
    const closeIndex = source.indexOf(activeClose, contentStart);
    if (closeIndex < 0) {
      throw new Error(`${sourceName}: unclosed Mustache tag at offset ${openIndex}`);
    }

    const rawTag = source.slice(contentStart, closeIndex);
    const tag = isTriple ? { type: 'unescaped', name: rawTag.trim() } : parseTag(rawTag);
    cursor = closeIndex + activeClose.length;

    if (tag.type === 'comment') continue;

    if (tag.type === 'delimiter') {
      if (!tag.value.endsWith('=')) {
        throw new Error(`${sourceName}: malformed delimiter declaration ${tag.value}`);
      }
      const declaration = tag.value.slice(1, -1).trim().split(/\s+/);
      if (declaration.length !== 2 || !declaration[0] || !declaration[1]) {
        throw new Error(`${sourceName}: malformed delimiter declaration ${tag.value}`);
      }
      [open, close] = declaration;
      continue;
    }

    if (tag.type === 'section' || tag.type === 'inverted') {
      if (!tag.name) throw new Error(`${sourceName}: section without a name`);
      const node = { type: tag.type, name: tag.name, children: [] };
      current.push(node);
      stack.push({ name: tag.name, children: node.children });
      current = node.children;
      continue;
    }

    if (tag.type === 'close') {
      if (stack.length === 1) {
        throw new Error(`${sourceName}: closing unopened section ${tag.name}`);
      }
      const opened = stack.pop();
      if (opened.name !== tag.name) {
        throw new Error(`${sourceName}: expected closing section ${opened.name}, got ${tag.name}`);
      }
      current = stack[stack.length - 1].children;
      continue;
    }

    if (!tag.name && tag.type !== 'text') {
      throw new Error(`${sourceName}: ${tag.type} tag without a name`);
    }
    current.push(tag);
  }

  if (stack.length !== 1) {
    throw new Error(`${sourceName}: unclosed section ${stack[stack.length - 1].name}`);
  }

  return root;
}

export function collectMustachePartials(ast, result = new Set()) {
  for (const node of ast) {
    if (node.type === 'partial') result.add(node.name);
    if (node.children) collectMustachePartials(node.children, result);
  }
  return result;
}

function renderNodes(nodes, state) {
  let output = '';
  for (const node of nodes) {
    if (node.type === 'text') {
      output += node.value;
      continue;
    }

    if (node.type === 'variable' || node.type === 'unescaped') {
      const value = lookupMustacheValue(state.contextStack, node.name);
      if (typeof value === 'function') {
        throw new Error(`Mustache lambdas are not supported for ${node.name}`);
      }
      if (value === null || value === undefined) continue;
      output += node.type === 'variable'
        ? htmlEscape(value)
        : state.renderUnescaped(node.name, value);
      continue;
    }

    if (node.type === 'partial') {
      const partialAst = state.partials[node.name];
      if (!partialAst) throw new Error(`Missing Mustache partial: ${node.name}`);
      output += renderNodes(partialAst, state);
      continue;
    }

    if (node.type === 'inverted') {
      const value = lookupMustacheValue(state.contextStack, node.name);
      if (isFalseySectionValue(value)) output += renderNodes(node.children, state);
      continue;
    }

    if (node.type === 'section') {
      const value = lookupMustacheValue(state.contextStack, node.name);
      if (typeof value === 'function') {
        throw new Error(`Mustache lambdas are not supported for section ${node.name}`);
      }
      if (isFalseySectionValue(value)) continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          state.contextStack.push(item);
          output += renderNodes(node.children, state);
          state.contextStack.pop();
        }
        continue;
      }

      if (value === true) {
        output += renderNodes(node.children, state);
        continue;
      }

      state.contextStack.push(value);
      output += renderNodes(node.children, state);
      state.contextStack.pop();
    }
  }
  return output;
}

export function renderMustacheAst(ast, view, {
  partials = {},
  renderUnescaped = (_name, value) => String(value)
} = {}) {
  const contextStack = [view ?? {}];
  return renderNodes(ast, { contextStack, partials, renderUnescaped });
}
