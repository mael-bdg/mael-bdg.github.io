{
  const map = document.querySelector('#project-map');
  const start = document.querySelector('.map-start');
  const status = document.querySelector('.map-status');
  const avatar = map.querySelector('.map-avatar');
  const canvas = avatar.querySelector('canvas');
  const pins = [...map.querySelectorAll('[data-project-pin]')];
  const secrets = [...map.querySelectorAll('.secret')];
  const count = document.querySelector('.discovery-count');
  const artwork = map.querySelector('img');
  const landmarks = [...map.querySelectorAll('[data-landmark]')];
  const panel = map.querySelector('.discovery-panel');
  const panelTitle = panel.querySelector('h2');
  const panelItems = panel.querySelector('.discovery-items');
  const towerPicture = document.createElement('img');
  const closePanel = panel.querySelector('.discovery-close');
  const found = new Set();
  const collectibles = [
    ['carte-postale-seoul.png', 'Carte postale de Séoul', 'Seoul postcard'],
    ['billet-de-train.png', 'Billet de train', 'Train ticket'],
    ['sauvegarde-secrete.png', 'Disquette de sauvegarde', 'Save disk'],
  ];
  let panelMode = null;
  let riding = false;
  let trainMessage = null;
  const language = document.querySelector('.language');
  const labels = [...document.querySelectorAll('[data-en]')];
  const french = labels.map(label => label.textContent);
  let lastSecret = null;

  function setLanguage(lang) {
    const english = lang === 'en';
    document.documentElement.lang = lang;
    document.title = english ? 'Project map — Maëlys Badger' : 'Carte des projets — Maëlys Badger';
    language.textContent = english ? 'FR' : 'EN';
    language.setAttribute('aria-label', english ? 'Afficher en français' : 'Switch to English');
    labels.forEach((label, i) => label.textContent = english ? label.dataset.en : french[i]);
    secrets.forEach(secret => secret.setAttribute('aria-label', english ? 'Discover a secret' : 'Découvrir un secret'));
    closePanel.setAttribute('aria-label', english ? 'Close' : 'Fermer');
    updatePanel();
    updateStatus();
  }

  const frame = [
    '....HHHH....',
    '...HHHHHH...',
    '...SSSSSEA..',
    '....SESSSA..',
    '....SSSSS...',
    '...JJQQJ....',
    '..BJJQQJJ...',
    '..BJJJJJJS..',
    '..BBJJJJ....',
    '....TTTT....',
    '....T..T....',
    '....T..T....',
    '...WW..WW...',
    '............',
  ];
  const colors = {H:'#3b2140',S:'#ffd0a0',E:'#3b2140',A:'#b96c56',J:'#60bea9',Q:'#ffe184',B:'#d58b53',T:'#4b3a72',W:'#fff2db'};
  const context = canvas.getContext('2d');
  frame.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel === '.') return;
    context.fillStyle = colors[pixel];
    context.fillRect(x, y, 1, 1);
  }));

  const bindings = new Map([
    ['ArrowLeft',[-1,0]],['q',[-1,0]],['a',[-1,0]],
    ['ArrowRight',[1,0]],['d',[1,0]],
    ['ArrowUp',[0,-1]],['z',[0,-1]],['w',[0,-1]],
    ['ArrowDown',[0,1]],['s',[0,1]],
  ]);
  const held = new Map();
  const position = {x:0.09,y:0.85};
  let near = null;
  let previous = 0;
  let animationId = 0;

  function updateStatus() {
    const english = document.documentElement.lang === 'en';
    let message = '';
    if (trainMessage) {
      message = trainMessage[Number(english)];
    } else if (near) {
      if (near.dataset.landmark === 'train') message = english ? 'Train · Enter to board' : 'Train · Entrée pour monter';
      else if (near.dataset.landmark === 'case') message = english ? 'Suitcase · Enter to open it' : 'Valise · Entrée pour l’ouvrir';
      else {
        const name = near.querySelector('.pin-label').textContent;
        message = english ? `Next stop: ${name} · Press Enter to open` : `Étape : ${name} · Appuie sur Entrée pour ouvrir`;
      }
    }
    if (status.textContent !== message) status.textContent = message;
  }

  function updatePanel() {
    if (!panelMode) return;
    const english = document.documentElement.lang === 'en';
    panel.dataset.mode = panelMode;
    if (panelMode === 'tower') {
      panelTitle.textContent = english ? 'Seoul Tower' : 'Tour de Séoul';
      const item = document.createElement('li');
      const view = document.createElement('figure');
      view.className = 'tower-view';
      towerPicture.alt = english ? 'The illuminated tower above Seoul at dusk' : 'La tour illuminée au-dessus de Séoul au crépuscule';
      const caption = document.createElement('figcaption');
      caption.textContent = english ? 'From the top of Namsan, the city lights stretch out below.'
        : 'Du sommet du Namsan, les lumières de la ville s’étendent à perte de vue.';
      view.append(towerPicture, caption);
      item.append(view);
      panelItems.replaceChildren(item);
      panel.hidden = false;
      return;
    }
    const isCase = panelMode === 'case';
    panelTitle.textContent = isCase ? (english ? 'Travel suitcase' : 'Valise de voyage')
      : (english ? 'Secret discovered' : 'Secret découvert');
    panelItems.replaceChildren();
    const items = isCase ? found : [lastSecret];
    if (isCase && found.size === 0) {
      const empty = document.createElement('li');
      empty.className = 'discovery-empty';
      empty.textContent = english ? 'Your discoveries will appear here as you explore.'
        : 'Tes découvertes apparaîtront ici au fil de ton exploration.';
      panelItems.append(empty);
    }
    for (const secret of items) {
      const item = document.createElement('li');
      item.className = 'discovery-item';
      const [filename, frenchTitle, englishTitle] = collectibles[Number(secret.dataset.art)];
      const picture = document.createElement('img');
      picture.className = 'collectible-art';
      picture.src = `image/${filename}`;
      picture.alt = english ? englishTitle : frenchTitle;
      const description = document.createElement('p');
      description.textContent = english ? secret.dataset.messageEn : secret.dataset.fr;
      item.append(picture, description);
      panelItems.append(item);
    }
    panel.hidden = false;
  }

  function dismissPanel() {
    panelMode = null;
    panel.hidden = true;
    map.focus({preventScroll:true});
  }

  function mapPicturePoint(worldX, worldY) {
    const width = map.clientWidth;
    const height = map.clientHeight;
    const pictureWidth = artwork.naturalWidth || 1536;
    const pictureHeight = artwork.naturalHeight || 1024;
    const scale = Math.max(width / pictureWidth, height / pictureHeight);
    const x = width / 2 + (worldX - .5) * pictureWidth * scale;
    const y = height / 2 + (worldY - .5) * pictureHeight * scale;
    return {
      x: Math.max(37, Math.min(width - 37, x)),
      y: Math.max(28, Math.min(height - 28, y)),
    };
  }

  function alignLandmarks() {
    for (const landmark of landmarks) {
      const {x, y} = mapPicturePoint(Number(landmark.dataset.worldX), Number(landmark.dataset.worldY));
      landmark.style.setProperty('--hot-x', `${x}px`);
      landmark.style.setProperty('--hot-y', `${y}px`);
    }
    render();
  }

  function boardTrain() {
    if (riding) return;
    stop();
    dismissPanel();
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const first = landmarks.find(landmark => landmark.dataset.landmark === 'train');
    const x = parseFloat(first.style.getPropertyValue('--hot-x')) / map.clientWidth;
    const y = parseFloat(first.style.getPropertyValue('--hot-y')) / map.clientHeight;
    if (!towerPicture.hasAttribute('src')) towerPicture.src = 'image/tour-seoul.webp';
    const tower = mapPicturePoint(.894, .223);
    const arrivalX = tower.x / map.clientWidth;
    const arrivalY = tower.y / map.clientHeight;
    riding = true;
    trainMessage = ['Prochain arrêt : la tour de Séoul !', 'Next stop: Seoul Tower!'];
    avatar.classList.add('is-riding');
    positionAt(x, y);
    updateStatus();
    const started = performance.now();
    function ride(time) {
      const progress = reducedMotion ? 1 : Math.min(1,(time - started) / 1650);
      const eased = progress * progress * (3 - 2 * progress);
      positionAt(x + (arrivalX - x) * eased - .07 * Math.sin(Math.PI * eased),
        y + (arrivalY - y) * eased);
      if (progress < 1) {
        requestAnimationFrame(ride);
        return;
      }
      riding = false;
      avatar.classList.remove('is-riding');
      trainMessage = ['Arrivée à la tour de Séoul.', 'Arrived at Seoul Tower.'];
      panelMode = 'tower';
      updatePanel();
      updateStatus();
      closePanel.focus({preventScroll:true});
    }
    requestAnimationFrame(ride);
  }

  function render() {
    const bounds = map.getBoundingClientRect();
    const x = position.x * map.clientWidth;
    const y = position.y * map.clientHeight;
    avatar.style.setProperty('--player-x', `${position.x * 100}%`);
    avatar.style.setProperty('--player-y', `${position.y * 100}%`);
    const distanceTo = (target) => {
      const marker = target.getBoundingClientRect();
      const dx = marker.left + marker.width / 2 - bounds.left - map.clientLeft - x;
      const dy = marker.top + marker.height / 2 - bounds.top - map.clientTop - y;
      return Math.hypot(dx, dy);
    };
    for (const secret of secrets) {
      if (!riding && !secret.hidden && distanceTo(secret) < 24) reveal(secret);
    }
    let closest = null;
    let distance = 37;
    for (const pin of [...pins, ...landmarks]) {
      const candidate = distanceTo(pin);
      if (candidate >= distance) continue;
      distance = candidate;
      closest = pin;
    }
    if (closest === near) return;
    near?.classList.remove('is-near');
    near = closest;
    near?.classList.add('is-near');
    updateStatus();
  }

  function reveal(secret) {
    if (secret.hidden) return;
    secret.hidden = true;
    lastSecret = secret;
    found.add(secret);
    count.textContent = `${found.size} / ${secrets.length}`;
    panelMode = 'secret';
    updatePanel();
  }

  function positionAt(x, y) {
    const width = map.clientWidth;
    const height = map.clientHeight;
    position.x = Math.max(16 / width, Math.min(1 - 16 / width, x));
    position.y = Math.max(30 / height, Math.min(1 - 8 / height, y));
    render();
  }

  function move(dx, dy, pixels) {
    const length = Math.hypot(dx, dy);
    if (!length) return;
    const width = map.clientWidth;
    const height = map.clientHeight;
    if (dx) avatar.style.setProperty('--facing', dx > 0 ? '1' : '-1');
    positionAt(position.x + dx * pixels / (length * width), position.y + dy * pixels / (length * height));
  }

  function tick(time) {
    let dx = 0;
    let dy = 0;
    for (const [x,y] of held.values()) {
      dx += x;
      dy += y;
    }
    move(Math.sign(dx), Math.sign(dy), Math.min(time - previous, 36) * Math.max(.15, map.clientWidth * .00023));
    previous = time;
    animationId = requestAnimationFrame(tick);
  }

  function stop() {
    held.clear();
    cancelAnimationFrame(animationId);
    animationId = 0;
  }

  avatar.hidden = false;
  start.hidden = false;
  map.tabIndex = 0;
  start.addEventListener('click', () => map.focus());
  map.addEventListener('focus', render);
  for (const secret of secrets) {
    secret.hidden = false;
    secret.addEventListener('click', () => {
      reveal(secret);
      map.focus({preventScroll:true});
    });
  }
  closePanel.addEventListener('click', dismissPanel);
  for (const landmark of landmarks) {
    landmark.addEventListener('click', () => {
      if (riding) return;
      if (landmark.dataset.landmark === 'train') boardTrain();
      else {
        trainMessage = null;
        panelMode = 'case';
        updatePanel();
        updateStatus();
        closePanel.focus();
      }
    });
  }
  map.addEventListener('click', (event) => {
    if (riding || event.target.closest('a,button,.discovery-panel')) return;
    trainMessage = null;
    const box = map.getBoundingClientRect();
    positionAt((event.clientX - box.left - map.clientLeft) / map.clientWidth,
      (event.clientY - box.top - map.clientTop) / map.clientHeight);
    map.focus({preventScroll:true});
    updateStatus();
  });
  map.addEventListener('blur', stop);
  map.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      dismissPanel();
      return;
    }
    if (riding || event.target !== map || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === 'Escape') {
      start.focus();
      return;
    }
    if (event.key === 'Enter' && near) {
      event.preventDefault();
      if (!event.repeat) near.click();
      return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const direction = bindings.get(key);
    if (!direction) return;
    event.preventDefault();
    if (held.has(key)) return;
    held.set(key, direction);
    trainMessage = null;
    move(...direction, 7);
    updateStatus();
    if (!animationId) {
      previous = performance.now();
      animationId = requestAnimationFrame(tick);
    }
  });
  map.addEventListener('keyup', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    held.delete(key);
    if (!held.size) stop();
  });
  window.addEventListener('blur', stop);
  new ResizeObserver(alignLandmarks).observe(map);
  artwork.addEventListener('load', alignLandmarks);
  alignLandmarks();
  const url = new URL(location.href);
  setLanguage(url.searchParams.get('lang') === 'en' ? 'en' : 'fr');
  language.addEventListener('click', () => setLanguage(document.documentElement.lang === 'en' ? 'fr' : 'en'));
  map.focus({preventScroll:true});
  document.addEventListener('DOMContentLoaded', () => {
    for (const pin of pins) {
      const link = projectRepositories[pin.dataset.projectPin]?.trim();
      if (link && /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/i.test(link)) pin.href = link;
    }
  });
}
