(() => {
  'use strict';

  const { ROOM_GRID, ROOM_OBJECTS, ROOM_THEMES } = window.CampusBuddyRoom;
  const STEP_MS = 145;

  function nearestObject(player, maxDistance = 1.25) {
    let best = null;
    let bestDistance = Infinity;
    for (const object of ROOM_OBJECTS) {
      const distance = Math.hypot(player.x - object.anchor.x, player.y - object.anchor.y);
      if (distance < bestDistance) {
        best = object;
        bestDistance = distance;
      }
    }
    return bestDistance <= maxDistance ? best : null;
  }

  function isBlocked(x, y) {
    if (x < 1 || x > 14 || y < 3 || y > 8) return true;
    return ROOM_OBJECTS.some(object => {
      if (object.id === 'window') return false;
      const { grid } = object;
      return x >= Math.floor(grid.x)
        && x <= Math.ceil(grid.x + grid.w) - 1
        && y >= Math.floor(grid.y)
        && y <= Math.ceil(grid.y + grid.h) - 1;
    });
  }

  function gridPointFromPointer(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const unit = Math.min(rect.width / ROOM_GRID.cols, rect.height / ROOM_GRID.rows);
    const offsetX = (rect.width - unit * ROOM_GRID.cols) / 2;
    const offsetY = (rect.height - unit * ROOM_GRID.rows) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / unit,
      y: (event.clientY - rect.top - offsetY) / unit
    };
  }

  function objectAtGridPoint(point) {
    return ROOM_OBJECTS.find(object => {
      const { grid } = object;
      return point.x >= grid.x && point.x <= grid.x + grid.w
        && point.y >= grid.y && point.y <= grid.y + grid.h;
    }) || null;
  }

  function drawPixelBuddy(ctx, state, x, y, tile) {
    const appearance = state.buddy.appearance;
    const px = tile / 22;
    ctx.save();
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(16,26,51,.18)';
    ctx.fillRect(-5*px, 9*px, 10*px, 2*px);
    ctx.fillStyle = appearance.bodyColor;
    ctx.strokeStyle = '#11131A';
    ctx.lineWidth = 2*px;
    ctx.beginPath(); ctx.arc(0, -7*px, 5*px, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillRect(-5*px, -2*px, 10*px, 10*px); ctx.strokeRect(-5*px, -2*px, 10*px, 10*px);
    if (appearance.top !== 'none') {
      ctx.fillStyle = '#FFF7E8'; ctx.fillRect(-5*px, -2*px, 10*px, 5*px);
      ctx.strokeRect(-5*px, -2*px, 10*px, 5*px);
    }
    if (appearance.bottom !== 'none') {
      ctx.fillStyle = '#7899BD'; ctx.fillRect(-4*px, 3*px, 8*px, 5*px);
      ctx.strokeRect(-4*px, 3*px, 8*px, 5*px);
    }
    ctx.fillStyle = appearance.eyeColor;
    ctx.fillRect(-2.8*px, -9*px, 1.3*px, 4*px); ctx.fillRect(1.5*px, -9*px, 1.3*px, 4*px);
    if (appearance.hairStyle !== 'none') {
      ctx.fillStyle = appearance.hairColor;
      ctx.fillRect(-5*px, -12*px, 10*px, 3*px);
    }
    const stride = state.player.walkFrame ? px : -px;
    ctx.strokeStyle = '#11131A'; ctx.lineWidth = 2*px;
    ctx.beginPath(); ctx.moveTo(-2*px, 8*px); ctx.lineTo(-3*px+stride, 12*px); ctx.moveTo(2*px, 8*px); ctx.lineTo(3*px-stride, 12*px); ctx.stroke();
    if (appearance.footwear !== 'none') {
      ctx.fillStyle='#FFF7E8'; ctx.fillRect((-5*px)+stride,11*px,5*px,2*px); ctx.fillRect(-stride,11*px,5*px,2*px);
    }
    ctx.restore();
  }

  function createExplorer({ state, canvas, miniMap, prompt, promptText }) {
    const heldMoves = new Map();
    let movementFrame = 0;

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }

    function drawMiniMap() {
      const ctx = miniMap.getContext('2d');
      const left = 8;
      const top = 8;
      const width = miniMap.width - 16;
      const height = miniMap.height - 16;
      ctx.clearRect(0, 0, miniMap.width, miniMap.height);
      ctx.fillStyle = '#111F38'; ctx.fillRect(0, 0, miniMap.width, miniMap.height);
      ctx.strokeStyle = '#E4BD67'; ctx.lineWidth = 2; ctx.strokeRect(left, top, width, height);

      for (const object of ROOM_OBJECTS) {
        const grid = object.grid;
        const x = left + (grid.x / ROOM_GRID.cols) * width;
        const y = top + (grid.y / ROOM_GRID.rows) * height;
        const w = Math.max(3, (grid.w / ROOM_GRID.cols) * width);
        const h = Math.max(3, (grid.h / ROOM_GRID.rows) * height);
        ctx.fillStyle = object.id === 'desk' ? '#72A7FF' : object.id === 'bed' ? '#D79B72' : object.id === 'bookshelf' ? '#C69B69' : '#77C5D5';
        ctx.globalAlpha = .78;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = '#5CF29B';
      ctx.beginPath();
      ctx.arc(left + (state.player.displayX / ROOM_GRID.cols)*width, top + (state.player.displayY / ROOM_GRID.rows)*height, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#09131F'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    function draw() {
      resizeCanvas();
      const ctx = canvas.getContext('2d');
      const theme = ROOM_THEMES[state.room];
      const unit = Math.min(canvas.width/ROOM_GRID.cols, canvas.height/ROOM_GRID.rows);
      const width = unit*ROOM_GRID.cols;
      const height = unit*ROOM_GRID.rows;
      const offsetX = (canvas.width-width)/2;
      const offsetY = (canvas.height-height)/2;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#D7E5E6'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.save(); ctx.translate(offsetX,offsetY); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = theme.wall; ctx.fillRect(0,0,width,unit*2.5);
      ctx.fillStyle = theme.floor; ctx.fillRect(0,unit*2.5,width,height-unit*2.5);
      ctx.strokeStyle = 'rgba(20,36,74,.16)'; ctx.lineWidth = 1;
      for (let x=0; x<=ROOM_GRID.cols; x+=1) { ctx.beginPath(); ctx.moveTo(x*unit,0); ctx.lineTo(x*unit,height); ctx.stroke(); }
      for (let y=0; y<=ROOM_GRID.rows; y+=1) { ctx.beginPath(); ctx.moveTo(0,y*unit); ctx.lineTo(width,y*unit); ctx.stroke(); }

      const windowObject = window.CampusBuddyRoom.objectById('window').grid;
      ctx.fillStyle = state.time==='night' ? '#1A3267' : state.time==='sunset' ? '#ED9277' : theme.sky;
      ctx.fillRect(windowObject.x*unit,windowObject.y*unit,windowObject.w*unit,windowObject.h*unit);
      ctx.strokeStyle = '#14244A'; ctx.lineWidth = 4; ctx.strokeRect(windowObject.x*unit,windowObject.y*unit,windowObject.w*unit,windowObject.h*unit);

      const bed = window.CampusBuddyRoom.objectById('bed').grid;
      ctx.fillStyle = '#75482F'; ctx.fillRect(bed.x*unit,bed.y*unit,bed.w*unit,bed.h*unit); ctx.strokeRect(bed.x*unit,bed.y*unit,bed.w*unit,bed.h*unit);
      ctx.fillStyle = theme.bedding; ctx.fillRect((bed.x+.15)*unit,(bed.y+.15)*unit,(bed.w-.3)*unit,(bed.h-.3)*unit);

      const desk = window.CampusBuddyRoom.objectById('desk').grid;
      ctx.fillStyle = '#85532F'; ctx.fillRect(desk.x*unit,desk.y*unit,desk.w*unit,desk.h*unit); ctx.strokeRect(desk.x*unit,desk.y*unit,desk.w*unit,desk.h*unit);
      ctx.fillStyle = '#233C66'; ctx.fillRect((desk.x+1.2)*unit,(desk.y-.95)*unit,1.6*unit,.9*unit);

      const shelf = window.CampusBuddyRoom.objectById('bookshelf').grid;
      ctx.fillStyle = '#705038'; ctx.fillRect(shelf.x*unit,shelf.y*unit,shelf.w*unit,shelf.h*unit); ctx.strokeRect(shelf.x*unit,shelf.y*unit,shelf.w*unit,shelf.h*unit);
      ctx.fillStyle = theme.rug; ctx.fillRect(6*unit,5*unit,4*unit,3*unit); ctx.strokeRect(6*unit,5*unit,4*unit,3*unit);
      ctx.fillStyle = '#24314B'; ctx.fillRect(7*unit,9*unit,2*unit,unit);
      drawPixelBuddy(ctx,state,(state.player.displayX+.5)*unit,(state.player.displayY+.55)*unit,unit);
      if (state.time === 'night') { ctx.fillStyle='rgba(15,31,67,.25)'; ctx.fillRect(0,0,width,height); }
      ctx.restore();

      const near = nearestObject(state.player);
      prompt.hidden = !near;
      if (near) promptText.textContent = near.label;
      drawMiniMap();
    }

    function heldMove() { return [...heldMoves.values()].at(-1) || null; }
    function scheduleFrame() { if (!movementFrame) movementFrame = requestAnimationFrame(animateMovement); }

    function animateMovement(now) {
      movementFrame = 0;
      const movement = state.player.movement;
      if (!movement) return;
      const progress = Math.max(0, Math.min(1, (now-movement.startedAt)/STEP_MS));
      state.player.displayX = movement.fromX + (movement.toX-movement.fromX)*progress;
      state.player.displayY = movement.fromY + (movement.toY-movement.fromY)*progress;
      draw();
      if (progress >= 1) {
        state.player.displayX = state.player.x;
        state.player.displayY = state.player.y;
        state.player.movement = null;
        const next = heldMove();
        if (next) move(next.dx,next.dy);
      }
      if (state.player.movement) scheduleFrame();
    }

    function move(dx,dy) {
      if (state.view !== 'explorer' || state.player.movement) return false;
      const stepX = Math.sign(dx); const stepY = Math.sign(dy);
      const nextX = state.player.x + stepX; const nextY = state.player.y + stepY;
      state.player.direction = stepX<0?'left':stepX>0?'right':stepY<0?'up':'down';
      if (isBlocked(nextX,nextY)) { draw(); return false; }
      state.player.movement = { fromX:state.player.displayX, fromY:state.player.displayY, toX:nextX, toY:nextY, startedAt:performance.now() };
      state.player.x = nextX; state.player.y = nextY; state.player.walkFrame = (state.player.walkFrame+1)%2;
      scheduleFrame();
      return true;
    }

    function hold(key, moveVector) {
      if (heldMoves.has(key)) return;
      heldMoves.set(key, moveVector);
      if (!state.player.movement) move(moveVector.dx,moveVector.dy);
    }

    function release(key) { heldMoves.delete(key); }
    function stop() { heldMoves.clear(); }
    function setPosition(x,y) { Object.assign(state.player,{x,y,displayX:x,displayY:y,movement:null}); }

    return { draw, move, hold, release, stop, setPosition, nearest:()=>nearestObject(state.player), objectAtPointer:event=>objectAtGridPoint(gridPointFromPointer(canvas,event)) };
  }

  window.CampusBuddyExplorer = Object.freeze({ STEP_MS, nearestObject, isBlocked, gridPointFromPointer, objectAtGridPoint, createExplorer });
})();
