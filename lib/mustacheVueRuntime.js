import { Fragment, cloneVNode, h, isVNode } from 'vue';

import LegacyRawHtmlFragment from './legacyRawHtmlFragment';
import { renderMustacheAst } from './mustacheTemplateEngine';

const MARKER_OPEN = '\uE000MVR:';
const MARKER_CLOSE = '\uE001';
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);
const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: '\u00a0',
  quot: '"'
});

function toHtmlString(value) {
  if (Array.isArray(value)) return value.map((item) => toHtmlString(item)).join('');
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return value.html || value.htmlItem || value['html-item'] || String(value);
}

function decodeHtmlEntities(value) {
  return String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith('#x')) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (lower.startsWith('#')) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower)
      ? NAMED_ENTITIES[lower]
      : match;
  });
}

function readMarker(source, offset) {
  if (!source.startsWith(MARKER_OPEN, offset)) return null;
  const closeIndex = source.indexOf(MARKER_CLOSE, offset + MARKER_OPEN.length);
  if (closeIndex < 0) throw new Error(`Unclosed Mustache/Vue marker at offset ${offset}`);
  const idText = source.slice(offset + MARKER_OPEN.length, closeIndex);
  if (!/^\d+$/.test(idText)) throw new Error(`Invalid Mustache/Vue marker ${idText}`);
  return {
    id: Number(idText),
    end: closeIndex + MARKER_CLOSE.length
  };
}

function skipWhitespace(source, state) {
  while (state.index < source.length && /\s/.test(source[state.index])) state.index += 1;
}

function readName(source, state) {
  const start = state.index;
  while (state.index < source.length && !/[\s=/>]/.test(source[state.index])) state.index += 1;
  return source.slice(start, state.index);
}

function readAttributeValue(source, state, rawRecords) {
  skipWhitespace(source, state);
  const quote = source[state.index];
  let result = '';
  if (quote === '"' || quote === "'") {
    state.index += 1;
    while (state.index < source.length && source[state.index] !== quote) {
      const marker = readMarker(source, state.index);
      if (marker) {
        result += toHtmlString(rawRecords[marker.id]?.value);
        state.index = marker.end;
      } else {
        result += source[state.index];
        state.index += 1;
      }
    }
    if (source[state.index] !== quote) throw new Error('Unclosed HTML attribute value');
    state.index += 1;
    return decodeHtmlEntities(result);
  }

  while (state.index < source.length && !/[\s>]/.test(source[state.index])) {
    const marker = readMarker(source, state.index);
    if (marker) {
      result += toHtmlString(rawRecords[marker.id]?.value);
      state.index = marker.end;
    } else {
      result += source[state.index];
      state.index += 1;
    }
  }
  return decodeHtmlEntities(result);
}

function parseAttributeFragment(fragment, rawRecords) {
  const attrs = {};
  const state = { index: 0 };
  while (state.index < fragment.length) {
    skipWhitespace(fragment, state);
    if (state.index >= fragment.length) break;
    const name = readName(fragment, state);
    if (!name) {
      state.index += 1;
      continue;
    }
    skipWhitespace(fragment, state);
    if (fragment[state.index] === '=') {
      state.index += 1;
      attrs[name] = readAttributeValue(fragment, state, rawRecords);
    } else {
      attrs[name] = '';
    }
  }
  return attrs;
}

function parseStartTag(source, state, rawRecords) {
  state.index += 1;
  const tag = readName(source, state).toLowerCase();
  if (!tag) throw new Error(`Missing HTML tag name at offset ${state.index}`);
  const attrs = {};
  let selfClosing = false;

  while (state.index < source.length) {
    skipWhitespace(source, state);
    const marker = readMarker(source, state.index);
    if (marker) {
      const record = rawRecords[marker.id];
      if (!record || record.kind !== 'raw') {
        throw new Error(`Only raw Mustache values may appear in an HTML attribute list`);
      }
      Object.assign(attrs, parseAttributeFragment(toHtmlString(record.value), rawRecords));
      state.index = marker.end;
      continue;
    }
    if (source.startsWith('/>', state.index)) {
      selfClosing = true;
      state.index += 2;
      break;
    }
    if (source[state.index] === '>') {
      state.index += 1;
      break;
    }

    const name = readName(source, state);
    if (!name) throw new Error(`Invalid HTML attribute at offset ${state.index}`);
    skipWhitespace(source, state);
    if (source[state.index] === '=') {
      state.index += 1;
      attrs[name] = readAttributeValue(source, state, rawRecords);
    } else {
      attrs[name] = '';
    }
  }

  return { tag, attrs, selfClosing: selfClosing || VOID_ELEMENTS.has(tag), children: [] };
}

function parseHtmlFragment(source, rawRecords) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const state = { index: 0 };

  while (state.index < source.length) {
    const marker = readMarker(source, state.index);
    if (marker) {
      const record = rawRecords[marker.id];
      if (!record) throw new Error(`Unknown Mustache/Vue marker ${marker.id}`);
      stack[stack.length - 1].children.push({ type: record.kind, value: record.value });
      state.index = marker.end;
      continue;
    }

    if (source.startsWith('<!--', state.index)) {
      const end = source.indexOf('-->', state.index + 4);
      state.index = end < 0 ? source.length : end + 3;
      continue;
    }

    if (source.startsWith('</', state.index)) {
      state.index += 2;
      skipWhitespace(source, state);
      const closingTag = readName(source, state).toLowerCase();
      const close = source.indexOf('>', state.index);
      if (close < 0) throw new Error(`Unclosed closing tag ${closingTag}`);
      state.index = close + 1;
      if (stack.length === 1) throw new Error(`Unexpected closing tag ${closingTag}`);
      const opened = stack.pop();
      if (opened.tag !== closingTag) {
        throw new Error(`Mismatched HTML tags: expected </${opened.tag}>, got </${closingTag}>`);
      }
      continue;
    }

    if (source[state.index] === '<') {
      if (source.startsWith('<!', state.index) || source.startsWith('<?', state.index)) {
        const end = source.indexOf('>', state.index + 2);
        state.index = end < 0 ? source.length : end + 1;
        continue;
      }
      const element = { type: 'element', ...parseStartTag(source, state, rawRecords) };
      stack[stack.length - 1].children.push(element);
      if (!element.selfClosing) stack.push(element);
      continue;
    }

    const nextTag = source.indexOf('<', state.index);
    const nextMarker = source.indexOf(MARKER_OPEN, state.index);
    const candidates = [nextTag, nextMarker].filter((index) => index >= 0);
    const end = candidates.length ? Math.min(...candidates) : source.length;
    const value = source.slice(state.index, end);
    if (value) stack[stack.length - 1].children.push({ type: 'text', value: decodeHtmlEntities(value) });
    state.index = end;
  }

  if (stack.length !== 1) {
    throw new Error(`Unclosed HTML tag <${stack[stack.length - 1].tag}>`);
  }
  return root.children;
}

function makeSlotAwareView(data, slotNames) {
  const base = data && typeof data === 'object' ? data : { '.': data };
  return new Proxy(base, {
    has(target, key) {
      return slotNames.has(String(key)) || Reflect.has(target, key);
    },
    get(target, key, receiver) {
      const name = String(key);
      if (slotNames.has(name)) return { __mustacheVueSlot: name };
      return Reflect.get(target, key, receiver);
    }
  });
}

function renderNamedSlot(slotName, slot) {
  const children = slot();
  const normalized = Array.isArray(children) ? children : [children];
  const key = `mvr-slot:${slotName}`;

  // Vue's compiler-owned renderSlot helper gives every named slot a stable
  // Fragment identity. This source renderer cannot call renderSlot directly,
  // because Mustache decides the insertion point at runtime, so reproduce the
  // same identity rule here. A single VNode keeps its original element shape;
  // multi-root slots receive one keyed Fragment boundary.
  if (normalized.length === 1 && isVNode(normalized[0])) {
    const child = normalized[0];
    return cloneVNode(child, child.key == null ? { key } : null);
  }
  return h(Fragment, { key }, normalized);
}

function renderTree(nodes, context, topLevel = false) {
  const rendered = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      rendered.push(node.value);
      continue;
    }
    if (node.type === 'raw') {
      rendered.push(h(LegacyRawHtmlFragment, { html: node.value }));
      continue;
    }
    if (node.type === 'slot') {
      const slotName = String(node.value);
      const slot = context.slots[slotName];
      if (slot) rendered.push(renderNamedSlot(slotName, slot));
      continue;
    }
    if (node.type !== 'element') continue;

    const props = { ...node.attrs };
    // Upstream ids are unique DOM identities. Preserve that identity in the
    // VNode graph as well so an inserted named slot cannot be reconciled with
    // an adjacent same-tag compatibility node such as #jump-to-nav.
    if (node.attrs.id) props.key = `mvr-id:${node.attrs.id}`;
    if (topLevel && context.eventBoundary) {
      props.onClick = (event) => context.emit('click', event);
      props.onSubmit = (event) => {
        if (context.interceptEvents.has('submit')) event.preventDefault();
        context.emit('submit', event);
      };
    }
    rendered.push(h(node.tag, props, renderTree(node.children, context, false)));
  }
  return rendered;
}

export function createMustacheVueComponent({ name, ast, partials = {} }) {
  return {
    name,
    inheritAttrs: false,
    emits: ['click', 'submit'],
    props: {
      data: {
        default: () => ({})
      },
      eventBoundary: {
        type: Boolean,
        default: true
      },
      interceptEvents: {
        type: Array,
        default: () => []
      }
    },
    render() {
      const rawRecords = [];
      const slotNames = new Set(Object.keys(this.$slots));
      const view = makeSlotAwareView(this.data, slotNames);
      const html = renderMustacheAst(ast, view, {
        partials,
        renderUnescaped: (_name, value) => {
          const slotName = value && value.__mustacheVueSlot;
          const record = slotName
            ? { kind: 'slot', value: slotName }
            : { kind: 'raw', value };
          const id = rawRecords.push(record) - 1;
          return `${MARKER_OPEN}${id}${MARKER_CLOSE}`;
        }
      });
      const tree = parseHtmlFragment(html, rawRecords);
      const children = renderTree(tree, {
        slots: this.$slots,
        emit: (event, payload) => this.$emit(event, payload),
        eventBoundary: this.eventBoundary,
        interceptEvents: new Set(this.interceptEvents)
      }, true);
      return h(Fragment, null, children);
    }
  };
}
