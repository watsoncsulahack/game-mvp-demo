(() => {
  'use strict';

  const { normalizeAngle, escapeHtml } = window.CampusBuddyCore;

  const BODY_PATHS = Object.freeze({
    front: 'M160 34C132 34 114 52 114 80V112C114 136 126 151 141 160V177C116 182 99 198 94 224L84 325C82 343 88 355 100 360L93 477L76 501C70 510 76 516 89 516H136C145 516 150 511 151 501L158 361H162L169 501C170 511 175 516 184 516H231C244 516 250 510 244 501L227 477L220 360C232 355 238 343 236 325L226 224C221 198 204 182 179 177V160C194 151 206 136 206 112V80C206 52 188 34 160 34Z',
    side: 'M151 34C128 34 113 49 113 75V116C113 139 125 153 143 159L151 162V179C130 183 116 198 113 223L110 329C110 344 115 356 123 364L119 475L101 497C93 507 98 515 111 516H157C168 516 173 510 173 499L176 369C183 374 192 374 199 369C207 363 211 353 209 340L207 226C205 203 193 190 176 184H168C160 184 155 177 155 169C155 161 161 155 170 154H176C194 154 203 141 204 121L203 79C201 51 181 35 157 34Z',
    back: 'M160 34C132 34 114 52 114 80V112C114 137 127 151 141 159V178C117 183 100 198 95 224L85 326C83 344 90 356 101 361L94 477L77 501C71 510 77 516 90 516H137C146 516 151 511 152 501L158 361H162L168 501C169 511 174 516 183 516H230C243 516 249 510 243 501L226 477L219 361C230 356 237 344 235 326L225 224C220 198 203 183 179 178V159C193 151 206 137 206 112V80C206 52 188 34 160 34Z'
  });

  const HAIR = Object.freeze({
    swept: 'M113 104Q114 49 160 40Q202 43 211 94Q183 73 158 81Q133 89 119 119Z',
    bob: 'M110 104Q111 47 160 40Q209 47 210 105L205 167Q183 154 160 164Q137 154 114 168Z',
    cloud: 'M105 91Q102 62 130 53Q143 30 166 44Q191 32 203 57Q222 66 215 91Q220 111 198 118Q180 129 160 113Q139 129 119 117Q98 110 105 91Z'
  });

  function outfitMarkup(style, view) {
    if (style === 'none') return '';
    const palette = style === 'hoodie'
      ? ['#5FB594', '#DFF7E9', '#38546D']
      : style === 'jacket'
        ? ['#EF9B7F', '#FFF5DC', '#4D6178']
        : ['#5D7FE6', '#DFF7FF', '#405675'];
    const [top, trim, pants] = palette;
    const side = view === 'side';
    const topPath = side
      ? 'M132 181Q157 169 183 180L196 221L190 347H134L126 220Z'
      : 'M101 184Q160 160 219 184L231 226L207 240L202 350H118L113 240L89 226Z';
    const pantsPath = side
      ? 'M135 343H190L198 483L179 499L162 390L151 499L126 495Z'
      : 'M118 344H202L210 483L184 502L161 392L138 502L111 483Z';
    return `<g data-outfit="true"><path d="${topPath}" fill="${top}" stroke="#11131A" stroke-width="6"/><path d="${pantsPath}" fill="${pants}" stroke="#11131A" stroke-width="6"/><path d="M140 184Q160 201 180 184" fill="none" stroke="${trim}" stroke-width="5"/></g>`;
  }

  function renderCharacter(buddy, { angle = 0, crop = 'full', pose = 'standing' } = {}) {
    const normalized = normalizeAngle(angle);
    const mirrored = normalized === 270;
    const view = normalized === 180 ? 'back' : normalized === 90 || normalized === 270 ? 'side' : 'front';
    const appearance = buddy.appearance;
    const bodyPath = BODY_PATHS[view];
    const eyes = view === 'back' ? '' : view === 'side'
      ? `<path data-eye="true" d="M181 78V116" stroke="${appearance.eyeColor}" stroke-width="10" stroke-linecap="round"/>`
      : `<path data-eye="true" d="M132 78V116M188 78V116" stroke="${appearance.eyeColor}" stroke-width="10" stroke-linecap="round"/>`;
    const hair = appearance.hairStyle === 'none' ? ''
      : `<path data-hair="true" d="${HAIR[appearance.hairStyle] || HAIR.swept}" fill="${appearance.hairColor}" stroke="#11131A" stroke-width="5" stroke-linejoin="round"/>`;
    const feet = view === 'side'
      ? '<path data-anatomy="foot" d="M118 475L101 497M176 472L204 497" stroke="#11131A" stroke-width="7" stroke-linecap="round"/>'
      : '<path data-anatomy="foot" d="M94 477L77 501M226 477L243 501" stroke="#11131A" stroke-width="7" stroke-linecap="round"/>';
    const hands = view === 'side'
      ? '<circle data-anatomy="hand" cx="199" cy="357" r="9" fill="none" stroke="#11131A" stroke-width="5"/>'
      : '<g data-anatomy="hand"><circle cx="98" cy="353" r="9" fill="none" stroke="#11131A" stroke-width="5"/><circle cx="222" cy="353" r="9" fill="none" stroke="#11131A" stroke-width="5"/></g>';
    const transform = `${mirrored ? 'translate(320 0) scale(-1 1)' : ''}${pose === 'sitting' ? ' rotate(4 160 330)' : ''}`.trim();
    const viewBox = crop === 'bust' ? '45 25 230 220' : crop === 'waist' ? '45 25 230 350' : '35 20 250 520';
    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(buddy.name)} ${view} view" data-buddy-angle="${normalized}">
      <g transform="${transform}" data-buddy-view="${view}">
        <ellipse cx="160" cy="520" rx="68" ry="8" fill="#14244A" opacity=".12"/>
        <path data-base-body="true" d="${bodyPath}" fill="${appearance.bodyColor}" stroke="#11131A" stroke-width="7" stroke-linejoin="round"/>
        <path data-anatomy="neck" d="M141 159V178M179 159V178" stroke="#11131A" stroke-width="5"/>
        ${eyes}${hands}${feet}${hair}${outfitMarkup(appearance.outfit, view)}
      </g>
    </svg>`;
  }

  function renderConsoleHead(buddy) {
    const { appearance } = buddy;
    const hair = appearance.hairStyle === 'none' ? ''
      : `<path d="M61 81Q64 32 128 29Q190 32 197 81Q160 59 79 99Z" fill="${appearance.hairColor}"/>`;
    return `<svg viewBox="0 0 256 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(buddy.name)} Console head" data-console-head="true">
      <path d="M128 35Q71 35 67 87V127Q68 166 96 183L96 207H160V183Q188 166 189 127V87Q185 35 128 35Z" fill="${appearance.bodyColor}" stroke="#252932" stroke-width="8"/>
      ${hair}
      <rect x="93" y="88" width="12" height="58" rx="6" fill="${appearance.eyeColor}"/><rect x="151" y="88" width="12" height="58" rx="6" fill="${appearance.eyeColor}"/>
    </svg>`;
  }

  window.CampusBuddyCharacter = Object.freeze({ BODY_PATHS, renderCharacter, renderConsoleHead });
})();
