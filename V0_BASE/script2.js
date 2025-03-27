/***************************************************
 * Fallback DOMMatrix (pour anciens Safari/Firefox)
 ***************************************************/
function createMatrix(transformStr) {
  // Si DOMMatrix existe, on l’utilise
  if (window.DOMMatrix) {
    return new DOMMatrix(transformStr);
  }
  // Sinon, fallback WebKitCSSMatrix (vieux Safari) / MozCSSMatrix (très vieux Firefox)
  if (window.WebKitCSSMatrix) {
    return new WebKitCSSMatrix(transformStr);
  }
  if (window.MozCSSMatrix) {
    return new MozCSSMatrix(transformStr);
  }
  console.warn(
    `Aucune matrice compatible trouvée, transformStr=`,
    transformStr
  );
  return null;
}

/***************************************************
 * Variables globales
 ***************************************************/
let scrollDepth = 0;
const scrollFactor = 0.1;
let lastCheckTime = 0;
let scrollDirection = `down`;
const marginClick = 20;

// Pour le `mur infini`
const gridsRight = document.querySelectorAll(`.right .grid`);
const gridsLeft = document.querySelectorAll(`.left .grid`);
const totalGrids = gridsRight.length;

// Seuils de détection
const THRESHOLD_UP = 3000;
const THRESHOLD_DOWN_MAX = -2500;
const THRESHOLD_DOWN_MIN = -3500;

let isScrolling = true;
let openedGrid = null;
// let openedGridOriginalTransform = ``;
let isOpen = false;
let g_duration = 400;
let vids;


function handleWheelEvent(event) {
  if (!isScrolling) return;
  // Empêche le comportement par défaut du navigateur (ex. : défilement de la page)
  if (event.preventDefault) {
    event.preventDefault();
  }

  // Calcule deltaY de façon cross-browser
  // deltaY existe généralement sur `wheel`, sinon on regarde wheelDelta / detail
  let deltaY = event.deltaY;
  if (typeof deltaY === `undefined`) {
    // Ancien Safari/Chrome IE
    deltaY = -event.wheelDelta || event.detail;
  }

  // Applique le scrollFactor
  const delta = deltaY * scrollFactor;

  // Détermine la direction
  scrollDirection = delta > 0 ? `down` : `up`;

  // Ajuste le scrollDepth
  scrollDepth += Math.round(delta);
  if (scrollDepth > 0) {
    scrollDepth = 0;
  }
  document.documentElement.style.setProperty(
    `--scroll-depth`,
    `${-scrollDepth}vw`
  );

  // Limite la fréquence de reposition
  const now = Date.now();
  if (now - lastCheckTime > 300) {
    detectOutOfFrame(scrollDirection);
    lastCheckTime = now;
  }
}

// Écouteurs multiples pour compatibilité large
window.addEventListener(`wheel`, handleWheelEvent, { passive: false });
window.addEventListener(`mousewheel`, handleWheelEvent, { passive: false });
window.addEventListener(`DOMMouseScroll`, handleWheelEvent, { passive: false });
window.addEventListener(`resize`, updateVideoScale);

/***************************************************
 * DETECTER LES GRILLES HORS-CHAMP
 ***************************************************/
function detectOutOfFrame(direction) {
  gridsRight.forEach((gridRight) => {
    const transform = getComputedStyle(gridRight).transform;
    if (transform && transform !== `none`) {
      // On crée une matrice (avec fallback si DOMMatrix indispo)
      const matrix = createMatrix(transform);
      if (!matrix) return;
      const zValue = matrix.m43;

      if (direction === `up` && zValue > THRESHOLD_UP) {
        repositionUp(gridRight);
      } else if (
        direction === `down` &&
        zValue < THRESHOLD_DOWN_MAX &&
        zValue > THRESHOLD_DOWN_MIN
      ) {
        // Trouve la grille la plus éloignée
        const targetSnap = Math.max(
          ...[...gridsRight].map((g) => Number(g.dataset.snap))
        );
        const targetGrid = [...gridsRight].find(
          (g) => Number(g.dataset.snap) === targetSnap
        );
        repositionDown(targetGrid);
      }
    }
  });
}

/***************************************************
 * repositionUp
 ***************************************************/
function repositionUp(gridRight) {
  const oldSnap = Number(gridRight.dataset.snap);
  const newSnap = oldSnap + totalGrids;
  repositionGrid(gridRight, newSnap, `right`, false);

  // Grille associée à gauche
  const leftIndex =
    ((newSnap % gridsLeft.length) + gridsLeft.length) % gridsLeft.length;
  const gridLeft = gridsLeft[leftIndex];
  if (!gridLeft) return;
  repositionGrid(gridLeft, newSnap, `left`, false);
}

/***************************************************
 * repositionDown
 ***************************************************/
function repositionDown(gridRight) {
  const oldSnap = Number(gridRight.dataset.snap);
  const newSnap = oldSnap - gridsRight.length;
  repositionGrid(gridRight, newSnap, `right`, false);

  const leftIndex =
    ((newSnap % gridsLeft.length) + gridsLeft.length) % gridsLeft.length;
  const gridLeft = gridsLeft[leftIndex];
  if (!gridLeft) return;
  repositionGrid(gridLeft, newSnap, `left`, false);
}

/***************************************************
 * repositionGrid
 ***************************************************/
function repositionGrid(gridEl, newSnap, side, instant = false) {
  gridEl.dataset.snap = newSnap;
  const factor = -1 * newSnap;

  const baseTranslateX =
    side === `right` ? `var(--base-translate-x)` : `var(--left-translate-x)`;
  const baseRotateY =
    side === `right` ? `var(--base-rotate-y)` : `var(--left-rotate-y)`;

  const finalTransform = `
     translateX(${baseTranslateX})
    translateZ(calc(var(--scroll-depth) + var(--sizeWall) * ${factor}))
    ${baseRotateY}
  `;

  if (instant) {
    // gridEl.style.transition = `none`;
    gridEl.style.transform = finalTransform;
    // gridEl.style.transition = ``;
    return;
  }

  // animation partielle
  const preTransform = `
    translateX(${baseTranslateX})
    translateZ(calc(var(--scroll-depth) + var(--sizeWall) * ${factor + 1}))
    ${baseRotateY}
  `;
  gridEl.style.opacity = `0`;
  gridEl.style.transform = preTransform;
  gridEl.style.zIndex = -newSnap;

  // force reflow
  const _forceReflow = gridEl.offsetHeight;

  setTimeout(() => {
    gridEl.style.opacity = `1`;
    gridEl.style.transform = finalTransform;
    gridEl.style.transition = `transform ${g_duration}ms linear, opacity ${g_duration}ms linear`;
    setTimeout(() => {
      gridEl.style.zIndex = ``;
      gridEl.style.transition = ``;
    }, g_duration * 1.6);
  }, 10);
}

/***************************************************
 * focusOnGrid : pour centrer la caméra
 ***************************************************/
function focusOnGrid({ gridElement, desiredZ, disableScroll = false, scene }) {
  const transform = getComputedStyle(gridElement).transform;
  if (!transform || transform === `none`) {
    console.warn(`Grille sans transform calculé, rien à ajuster.`);
    return;
  }

  const matrix = createMatrix(transform);
  if (!matrix) return;

  const zValue = (matrix.m43 / window.innerWidth) * 100;
  const offset = zValue - desiredZ;

  scrollDepth += offset;
  if (scrollDepth > 0) {
    scrollDepth = 0;
  }
  scene.classList.add(`allActive`);
  document.documentElement.style.setProperty(
    `--scroll-depth`,
    `${-scrollDepth}vw`
  );
  setTimeout(() => {
    scene.classList.remove(`allActive`);
    const vid = gridElement.querySelector(`video`);
    if (vid && vid.paused) {
      vid.play().catch((err) => console.log(`Vid play error:`, err));
      currentPlayingVideo = vid;
    }
  }, g_duration);

  if (disableScroll) {
    isScrolling = false;
  }
}

/***************************************************
 * toggleVideo
 ***************************************************/
function toggleVideo(gridElement) {
  const vid = gridElement.querySelector(`video`);
  if (vid && !vid.matches(`:hover`)) {
    vid.pause();
    // vid.currentTime = 0;
  }
  // openedGrid = null;
  isScrolling = true;
}

/***************************************************
 * CLICK : ouvrir / fermer la grille
 ***************************************************/
window.addEventListener(`click`, (e) => {
  const inner = e.target.closest(`.inner`);
  const scene = document.querySelector(`.scene`);

  const grid = e.target.closest(`.grid`);
  if (inner && !isOpen) {
    handleVideoMouseLeave(e);
    grid.classList.add(`active`);
    openGrid({ grid: grid, inner: inner, scene: scene });
    openedGrid = { grid: grid, inner: inner };
  } else if (isOpen) {
    const wiSe = window.innerWidth;
    const marClck = (marginClick * wiSe) / 100;
    e.x < marClck || e.x > wiSe - marClck
      ? closeScroll({
          grid: openedGrid.grid,
          inner: openedGrid.inner,
          scene: scene,
        })
      : null;
    // openedGrid = null;
  }
});

function openGrid({ grid, inner, scene }) {
  if (!inner) return;
  scene.classList.add(`isOpen`);
  animateWithKeyframe({
    el: inner,
    fromVal: `rotateY(0deg)`,
    toVal: inner.closest(`.left`) ? `rotateY(-90deg)` : `rotateY(90deg)`,
    fromWidth: 100,
    toWidth: 83.33,
    duration: g_duration,
    onDone: () => {
      isOpen = true;
      inner.style.transform = `rotateY(-90deg)`;
      inner.style.width = `83.33%`;

      focusOnGrid({
        gridElement: grid,
        // desiredZ: -3470,
        desiredZ: -150,
        disableScroll: true,
        scene: scene,
      });
    },
  });
}

function closeScroll({ grid, inner, scene }) {
  const scrollZone = inner.querySelector(".inner-container");
  if (!scrollZone) {
    // Si pas de scrollZone, on ferme directement
    closeGrid({ grid, inner, scene });
    return;
  }

  // Vérifie si on est déjà tout en haut
  if (scrollZone.scrollTop !== 0) {
    // On remonte avec scrollTo smooth
    scrollZone.scrollTo({ top: 0, behavior: "smooth" });

    // Ecoute "scroll". Dès que scrollTop==0, on ferme
    const checkScrollTop = () => {
      if (scrollZone.scrollTop === 0) {
        // On enlève l'écouteur pour éviter les déclenchements multiples
        scrollZone.removeEventListener("scroll", checkScrollTop);
        closeGrid({ grid, inner, scene });
      }
    };
    scrollZone.addEventListener("scroll", checkScrollTop, { passive: true });
  } else {
    // Si on est déjà à 0, on ferme directement
    closeGrid({ grid, inner, scene });
  }
}

/**
 * Ferme réellement la grille (animation Keyframe) une fois le scroll remis à 0.
 */
function closeGrid({ grid, inner, scene }) {
  // On retire .isOpen un peu après pour un effet
  setTimeout(() => {
    scene.classList.remove("isOpen");
  }, g_duration);

  // Lance l'animation Keyframe pour replier le panneau
  animateWithKeyframe({
    el: inner,
    // Si c'est la grille de gauche => rotationY(-90deg) => 0
    // Sinon => rotationY(90deg) => 0
    fromVal: inner.closest(".left") ? "rotateY(-90deg)" : "rotateY(90deg)",
    toVal: "rotateY(0deg)",
    fromWidth: 83.33,
    toWidth: 100,
    duration: g_duration,
    onDone: () => {
      isOpen = false;

      // Nettoyage des styles
      inner.style.transform = "";
      inner.style.width = "100%";

      // Pause / Stop vidéo si nécessaire
      toggleVideo(inner);

      // Re-défilement éventuel du tunnel
      simulateScroll(-100);

      grid.classList.remove("active");
    },
  });
}

function getOpenTransform(grid) {
  if (grid.closest(`.left`)) {
    return `translateX(var(--left-translate-x)) translateZ(calc(var(--scroll-depth) + var(--sizeWall)* -${grid.dataset.snap})) rotateY(0deg)`;
  } else {
    return `translateX(var(--base-translate-x)) translateZ(calc(var(--scroll-depth) + var(--sizeWall)* -${grid.dataset.snap})) rotateY(0deg)`;
  }
}
function getClosedTransform(grid) {
  if (grid.closest(`.left`))
    return `translateX(var(--left-translate-x)) translateZ(calc(var(--scroll-depth) + var(--sizeWall)* -${grid.dataset.snap})) rotateY(90deg)`;
  else
    return `translateX(var(--base-translate-x))
      translateZ(calc(var(--scroll-depth) + var(--sizeWall)* -${grid.dataset.snap}))
      rotateY(-90deg)`;
}
function animateWithKeyframe({
  el,
  fromVal,
  toVal,
  fromWidth = 100,
  toWidth = 100,
  duration = 100,
  onDone,
}) {
  // 1. Générer un nom de keyframe unique
  const animName = `anim_` + Math.floor(Math.random() * 999999);

  // 2. Créer le style avec la keyframe
  const styleEl = document.createElement(`style`);
  styleEl.innerHTML = `
    @keyframes ${animName} {
      from {
        transform: ${fromVal};
        width: ${fromWidth}%;
      }
      to {
        transform: ${toVal};
        width: ${toWidth}%;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // 3. Appliquer l’animation à l’élément
  el.style.animation = `${animName} ${duration}ms forwards ease`;
  // el.style.animation = `${animName} ${2000}ms forwards ease`;

  // 4. Sur animationend, on nettoie
  function finish() {
    el.style.animation = ``;
    styleEl.remove();
    if (typeof onDone === `function`) {
      onDone();
    }
  }
  setTimeout(finish, duration);
  // el.addEventListener(`animationend`, finish, { once: true });
}

/***************************************************
 * simulateScroll : on modifie scrollDepth + detectOutOfFrame
 ***************************************************/
function simulateScroll(deltaY) {
  const delta = deltaY * scrollFactor;
  scrollDirection = delta > 0 ? `down` : `up`;

  scrollDepth += delta;
  if (scrollDepth > 0) {
    scrollDepth = 0;
  }

  document.documentElement.style.setProperty(
    `--scroll-depth`,
    `${-scrollDepth}vw`
  );
  detectOutOfFrame(scrollDirection);
}

/***************************************************
 * GESTION DES VIDEOS (hover)
 ***************************************************/
const miniVideos = document.querySelectorAll(`.grid video`);
let currentPlayingVideo = null;

miniVideos.forEach((vid) => {
  vid.loop = true;
  vid.muted = true;

  vid.addEventListener(`mouseenter`, handleVideoMouseEnter);
  vid.addEventListener(`mouseleave`, handleVideoMouseLeave);
});

function handleVideoMouseEnter(e) {
  const vid = e.target;
  if (!(vid instanceof HTMLVideoElement)) return;

  if (currentPlayingVideo && currentPlayingVideo !== vid) {
    currentPlayingVideo.pause();
    // currentPlayingVideo.currentTime = 0;
    currentPlayingVideo = null;
  }

  vid.play().catch((err) => console.log(`Impossible de lancer la vidéo:`, err));
  currentPlayingVideo = vid;
}

function handleVideoMouseLeave(e) {
  const vid = e.target;
  if (!(vid instanceof HTMLVideoElement)) return;

  const gridParent = vid.closest(`.grid`);
  if (!gridParent) return;

  // Si pas `active`, on arrête
  if (!gridParent.classList.contains(`active`)) {
    vid.pause();
    // vid.currentTime = 0;
    if (currentPlayingVideo === vid) {
      currentPlayingVideo = null;
    }
  }
}
function updateVideoScale() {
  const container = document.querySelector(`.grid .inner`);
  const w = container.offsetWidth;
  const h = container.offsetHeight;
  // Suppose your video ratio ou un ratio “cible”
  // const ratioVideo = 16/9;
  const ratioVideo = 3 / 4;

  const ratioContainer = w / h;
  let scaleNeeded;
  if (ratioVideo > ratioContainer) {
    // La vidéo est plus large => on évalue la hauteur comme contrainte
    scaleNeeded = ratioVideo / ratioContainer;
  } else {
    // La vidéo est plus haute => contrainte en largeur
    scaleNeeded = ratioContainer / ratioVideo;
  }

  // Applique un scale minimal ex. 1.0
  if (scaleNeeded < 1) scaleNeeded = 1;

  document.documentElement.style.setProperty(`--vidScale`, scaleNeeded);
}

window.addEventListener(`load`, () => {
  // setTimeout(() => {
  vids = document.querySelectorAll(`video`);
  vids.forEach((vid) => {
    vid.autoplay = false;
    vid.defaultMuted= false;
    console.log(vid.defaultMuted);
  });
  updateVideoScale();
});
