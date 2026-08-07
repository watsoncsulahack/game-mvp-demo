(() => {
  'use strict';

  const DEFAULT_APPEARANCE = Object.freeze({
    bodyColor: '#F7FBFC',
    eyeColor: '#171923',
    hairStyle: 'none',
    hairColor: '#26354D',
    outfit: 'none'
  });

  const DISPOSITIONS = Object.freeze({
    curious: 'Curious Buddies ask follow-up questions and notice patterns.',
    steady: 'Steady Buddies prefer clear routines, calm plans, and follow-through.',
    playful: 'Playful Buddies develop jokes, wordplay, and surprising reactions.',
    bold: 'Bold Buddies propose experiments and encourage decisive action.',
    reflective: 'Reflective Buddies connect today with earlier memories and themes.'
  });

  function createState() {
    return {
      onboardingStep: 1,
      email: '',
      campus: 'University',
      identity: 'BUDDY-000000',
      room: 'sunlit',
      time: 'day',
      view: 'room',
      wallet: 60,
      buddy: {
        name: 'Mika',
        disposition: 'curious',
        appearance: { ...DEFAULT_APPEARANCE }
      },
      player: {
        x: 8,
        y: 7,
        displayX: 8,
        displayY: 7,
        direction: 'down',
        walkFrame: 0,
        movement: null
      },
      activity: 'center',
      previewAngle: 0,
      consoleTool: null
    };
  }

  function hashText(text) {
    let hash = 2166136261;
    for (const char of String(text)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.edu$/i.test(String(value).trim());
  }

  function profileFromEmail(email) {
    const normalized = String(email).trim().toLowerCase();
    const domain = normalized.split('@')[1] || 'university.edu';
    let campus = domain.split('.')[0].replace(/[-_]/g, ' ');
    if (/csulb|student\.csulb/i.test(domain)) {
      campus = 'California State University, Long Beach';
    } else {
      campus = campus.replace(/\b\w/g, char => char.toUpperCase()) || 'University';
    }
    return { campus, identity: `BUDDY-${hashText(normalized).slice(0, 6)}` };
  }

  function normalizeAngle(angle) {
    return ((Math.round(Number(angle) / 90) * 90) % 360 + 360) % 360;
  }

  function hslToHex(hue, saturation, lightness) {
    const h = ((Number(hue) % 360) + 360) % 360;
    const s = Number(saturation) / 100;
    const l = Number(lightness) / 100;
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const segment = h / 60;
    const x = chroma * (1 - Math.abs(segment % 2 - 1));
    const [r1, g1, b1] = segment < 1 ? [chroma, x, 0]
      : segment < 2 ? [x, chroma, 0]
      : segment < 3 ? [0, chroma, x]
      : segment < 4 ? [0, x, chroma]
      : segment < 5 ? [x, 0, chroma]
      : [chroma, 0, x];
    const m = l - chroma / 2;
    const hex = [r1, g1, b1]
      .map(value => Math.round((value + m) * 255).toString(16).padStart(2, '0'))
      .join('');
    return `#${hex.toUpperCase()}`;
  }

  function capitalize(value) {
    const text = String(value || '');
    return text ? text[0].toUpperCase() + text.slice(1) : '';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function evaluateArithmetic(expression) {
    const source = String(expression).trim();
    if (!source || !/^[0-9+\-*/().\s%]+$/.test(source)) throw new Error('Invalid expression');
    let index = 0;

    const skipSpace = () => { while (/\s/.test(source[index] || '')) index += 1; };
    const peek = () => { skipSpace(); return source[index]; };
    const consume = char => {
      skipSpace();
      if (source[index] !== char) return false;
      index += 1;
      return true;
    };

    function parseNumber() {
      skipSpace();
      const start = index;
      while (/[0-9.]/.test(source[index] || '')) index += 1;
      const raw = source.slice(start, index);
      if (!raw || (raw.match(/\./g) || []).length > 1) throw new Error('Invalid number');
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error('Invalid number');
      return value;
    }

    function parsePrimary() {
      if (consume('+')) return parsePrimary();
      if (consume('-')) return -parsePrimary();
      if (consume('(')) {
        const value = parseAdditive();
        if (!consume(')')) throw new Error('Missing closing parenthesis');
        return value;
      }
      return parseNumber();
    }

    function parseMultiplicative() {
      let value = parsePrimary();
      while (true) {
        const operator = peek();
        if (!['*', '/', '%'].includes(operator)) break;
        index += 1;
        const right = parsePrimary();
        if ((operator === '/' || operator === '%') && right === 0) throw new Error('Division by zero');
        value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
      }
      return value;
    }

    function parseAdditive() {
      let value = parseMultiplicative();
      while (true) {
        const operator = peek();
        if (!['+', '-'].includes(operator)) break;
        index += 1;
        const right = parseMultiplicative();
        value = operator === '+' ? value + right : value - right;
      }
      return value;
    }

    const result = parseAdditive();
    skipSpace();
    if (index !== source.length || !Number.isFinite(result)) throw new Error('Invalid expression');
    return result;
  }

  window.CampusBuddyCore = Object.freeze({
    DEFAULT_APPEARANCE,
    DISPOSITIONS,
    createState,
    validateEmail,
    profileFromEmail,
    normalizeAngle,
    hslToHex,
    capitalize,
    escapeHtml,
    evaluateArithmetic
  });
})();
