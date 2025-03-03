/***************************************************
 * 1) Fallback DOMMatrix (pour anciens Safari/Firefox)
 ***************************************************/
function createMatrix(transformStr) {
  if (window.DOMMatrix) {
    return new DOMMatrix(transformStr);
  }
  if (window.WebKitCSSMatrix) {
    return new WebKitCSSMatrix(transformStr);
  }
  if (window.MozCSSMatrix) {
    return new MozCSSMatrix(transformStr);
  }
  console.warn("Aucune matrice compatible trouvée pour:", transformStr);
  return null;
}

/***************************************************
 * 2) Variables globales
 ***************************************************/
let scrollDepth = 0;
let scrollFactor = 0.1; // Ajuste la sensibilité du "scroll" (wheel/touch)
// let isHoverableDevice = false;
let lastCheckTime = 0;
let scrollDirection = "down";

const marginClick = 20; // pour la détection de clic sur les bords
const g_duration = 600; // durée anim

// Grilles left/right
const gridsRight = document.querySelectorAll(".right .grid");
const gridsLeft = document.querySelectorAll(".left .grid");
const totalGrids = gridsRight.length;

// Seuils de détection
const THRESHOLD_UP = 3000;
const THRESHOLD_DOWN_MAX = -2500;
const THRESHOLD_DOWN_MIN = -3500;

// Contrôle du scroll + ouvertures

let startY = 0;
let velocity = 0; // vitesse
let friction = 0.92; // chaque frame, velocity *= friction
let isTouching = false;
let isScrolling = true;
let isOpen = false;
let openedGrid = null; // { grid, inner } quand une grille est ouverte

// Vidéos
let currentPlayingVideo = null;

/***************************************************
 * 3) handleWheelEvent (desktop "wheel" ou "mousewheel")
 ***************************************************/
function handleWheelEvent(e) {
  if (!isScrolling) return;
  if (e.preventDefault) e.preventDefault();

  let deltaY = e.deltaY;
  if (typeof deltaY === "undefined") {
    deltaY = -e.wheelDelta || e.detail;
  }

  const delta = deltaY * scrollFactor;
  scrollDirection = delta > 0 ? "down" : "up";

  scrollDepth += Math.round(delta);
  if (scrollDepth > 0) {
    scrollDepth = 0;
  }

  document.documentElement.style.setProperty(
    "--scroll-depth",
    `${-scrollDepth}vw`
  );

  const now = Date.now();
  if (now - lastCheckTime > 300) {
    detectOutOfFrame(scrollDirection);
    lastCheckTime = now;
  }
}

/* Resize => updateVideoScale si besoin */
window.addEventListener("resize", updateVideoScale);
document.addEventListener("DOMContentLoaded", manageCoverVideo, {
  passive: true,
});
/* Au load, on peut init nos vidéos, etc. */
window.addEventListener(
  "load",
  () => {
    const isHoverableDevice = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    scrollFactor = isHoverableDevice ? 0.1 : 1.5;
    isHoverableDevice ? loadDesktop() : loadMobile();

    const vids = document.querySelectorAll("video");
    vids.forEach((vid) => {
      vid.autoplay = false;
      vid.defaultMuted = false;
    });
    updateVideoScale();
  },
  { passive: true }
);

function loadMobile() {
  console.log("---MOBILE---");
  window.addEventListener("touchstart", handleTouchStart, { passive: false });
  window.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("touchend", handleTouchEnd, { passive: false });
}
function loadDesktop() {
  console.log("---DESKTOP---");
  window.addEventListener("wheel", handleWheelEvent, { passive: false });
  // window.addEventListener("mousewheel", handleWheelEvent, { passive: false });
  // window.addEventListener("DOMMouseScroll", handleWheelEvent, { passive: false });
  window.addEventListener("click", handleClick, { passive: false });
}
function inertiaLoop() {
  if (isTouching) return;

  // On “freine” la vitesse
  velocity *= friction;

  // Applique la vitesse freinée au scrollDepth
  scrollDepth += velocity;

  // Bloque si on dépasse le “haut”
  if (scrollDepth > 0) {
    scrollDepth = 0;
    velocity = 0;
  }

  document.documentElement.style.setProperty(
    "--scroll-depth",
    `${-scrollDepth}vw`
  );

  // Détection hors-champ
  // (On peut le faire moins souvent si on veut)
  if (Math.abs(velocity) > 0.01) {
    // continue tant qu'on a de la vitesse
    const dir = velocity > 0 ? "down" : "up";
    const now = Date.now();
    if (now - lastCheckTime > 300) {
      detectOutOfFrame(dir);
      lastCheckTime = now;
    }
    requestAnimationFrame(inertiaLoop);
  } else {
    // Vitesse trop faible => on arrête
    velocity = 0;
  }
}
/***************************************************
 * 5) detectOutOfFrame : pour repositionner le mur infini
 ***************************************************/
function detectOutOfFrame(direction) {
  gridsRight.forEach((gridRight) => {
    const transform = getComputedStyle(gridRight).transform;
    if (transform && transform !== "none") {
      const matrix = createMatrix(transform);
      if (!matrix) return;
      const zValue = matrix.m43;

      if (direction === "up" && zValue > THRESHOLD_UP) {
        repositionUp(gridRight);
      } else if (
        direction === "down" &&
        zValue < THRESHOLD_DOWN_MAX &&
        zValue > THRESHOLD_DOWN_MIN
      ) {
        // On récupère la grille la plus "lointaine"
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
 * repositionUp / repositionDown
 ***************************************************/
function repositionUp(gridRight) {
  const oldSnap = Number(gridRight.dataset.snap);
  const newSnap = oldSnap + totalGrids;
  repositionGrid(gridRight, newSnap, "right", false);

  const leftIndex =
    ((newSnap % gridsLeft.length) + gridsLeft.length) % gridsLeft.length;
  const gridLeft = gridsLeft[leftIndex];
  if (!gridLeft) return;
  repositionGrid(gridLeft, newSnap, "left", false);
}

function repositionDown(gridRight) {
  const oldSnap = Number(gridRight.dataset.snap);
  const newSnap = oldSnap - gridsRight.length;
  repositionGrid(gridRight, newSnap, "right", false);

  const leftIndex =
    ((newSnap % gridsLeft.length) + gridsLeft.length) % gridsLeft.length;
  const gridLeft = gridsLeft[leftIndex];
  if (!gridLeft) return;
  repositionGrid(gridLeft, newSnap, "left", false);
}

/***************************************************
 * repositionGrid : applique la transform finale
 ***************************************************/
function repositionGrid(gridEl, newSnap, side, instant = false) {
  gridEl.dataset.snap = newSnap;
  const factor = -1 * newSnap;

  const baseTranslateX =
    side === "right" ? "var(--base-translate-x)" : "var(--left-translate-x)";
  const baseRotateY =
    side === "right" ? "var(--base-rotate-y)" : "var(--left-rotate-y)";

  const finalTransform = `
    translateX(${baseTranslateX})
    translateZ(calc(var(--scroll-depth) + var(--sizeWall) * ${factor}))
    ${baseRotateY}
  `;
  if (instant) {
    gridEl.style.transform = finalTransform;
    return;
  }

  // Animation
  const preTransform = `
    translateX(${baseTranslateX})
    translateZ(calc(var(--scroll-depth) + var(--sizeWall) * ${factor + 1}))
    ${baseRotateY}
  `;
  gridEl.style.transform = preTransform;
  gridEl.style.zIndex = -newSnap;

  // force reflow
  const _forceReflow = gridEl.offsetHeight;

  // Lance la transition
  gridEl.style.transform = finalTransform;
  gridEl.style.transition = `transform ${g_duration / 2}ms linear`;

  setTimeout(() => {
    gridEl.style.transition = "";
  }, g_duration);
}

/***************************************************
 * 6) focusOnGrid : centrer la "caméra" sur une grille
 ***************************************************/
function focusOnGrid({ gridElement, desiredZ, disableScroll = false, scene }) {
  const transform = getComputedStyle(gridElement).transform;
  if (!transform || transform === "none") {
    console.warn("Grille sans transform calculé.");
    return;
  }

  const matrix = createMatrix(transform);
  if (!matrix) return;

  // Calcul en pourcentage (vw)
  const zValue = (matrix.m43 / window.innerWidth) * 100;
  const offset = zValue - desiredZ;

  scrollDepth += offset;
  if (scrollDepth > 0) scrollDepth = 0;

  scene.classList.add("allActive");
  document.documentElement.style.setProperty(
    "--scroll-depth",
    `${-scrollDepth}vw`
  );

  setTimeout(() => {
    scene.classList.remove("allActive");
    const vid = gridElement.querySelector("video");
    if (vid && vid.paused) {
      vid.play().catch((err) => console.log("Vid play error:", err));
      currentPlayingVideo = vid;
    }
  }, g_duration);

  if (disableScroll) {
    isScrolling = false;
  }
}

/***************************************************
 * 7) toggleVideo (fermer la vidéo si besoin)
 ***************************************************/
function toggleVideo(gridElement) {
  const vid = gridElement.querySelector("video");
  if (vid && !vid.matches(":hover")) {
    vid.pause();
    // vid.currentTime = 0;
  }
  isScrolling = true;
}

/***************************************************
 * 8) handleClick : Ouvrir/fermer la grille
 ***************************************************/
function handleTouchStart(e) {
  if (e.touches.length === 1) {
    startY = e.touches[0].clientY;
    isTouching = true;
    velocity = 0;
  }
}
function handleTouchMove(e) {
  if (!isScrolling) return;
  e.preventDefault();

  if (e.touches.length === 1) {
    let currentY = e.touches[0].clientY;
    let deltaY = startY - currentY;
    // startY - currentY => si positif, on “descend” => direction = "down"

    // On définit la vitesse instantanée
    // (plus tard, on laissera la friction l'atténuer)
    velocity = deltaY * scrollFactor;

    // On applique immédiatement cette vitesse à scrollDepth
    scrollDepth += velocity;
    if (scrollDepth > 0) {
      scrollDepth = 0;
    }

    document.documentElement.style.setProperty(
      "--scroll-depth",
      `${-scrollDepth}vw`
    );

    // Détection hors-champ (limité par lastCheckTime)
    const now = Date.now();
    if (now - lastCheckTime > 300) {
      const scrollDirection = deltaY > 0 ? "down" : "up";
      detectOutOfFrame(scrollDirection);
      lastCheckTime = now;
    }

    // Met à jour startY
    startY = currentY;
  }
}
function handleTouchEnd(e) {
  isTouching = false;
  requestAnimationFrame(inertiaLoop);
}
function handleClick(e) {
  const scene = document.querySelector(".scene");
  const grid = e.target.closest(".grid");
  const inner = e.target.closest(".inner");
  if (!grid) return;

  // S'il y a déjà une grille ouverte et c'est pas la même
  if (isOpen && openedGrid && openedGrid.grid !== grid) {
    // on ferme l'ancienne
    // closeScroll({
    //   grid: openedGrid.grid,
    //   inner: openedGrid.inner,
    //   scene,
    // });
  }

  // Si pas encore ouvert
  if (!isOpen && inner) {
    grid.classList.add("active");
    openGrid({ grid, inner, scene });
    openedGrid = { grid, inner };

    projectManager({
      target: grid.dataset.ref,
      scrollZone: document.querySelector(".projects"),
    });
  }
  // sinon si c'est déjà ouvert => on ferme
  else if (isOpen && openedGrid.grid === grid) {
    // Vérifie si on clique sur bord => on ferme
    const wiSe = window.innerWidth;
    const marClck = (marginClick * wiSe) / 100;
    if (e.x < marClck || e.x > wiSe - marClck) {
      // closeScroll({ grid, inner, scene });
    }
  }
  /*************  ✨ Codeium Command ⭐  *************/
  /**
   * Fonction qui détecte si on clique sur un projet (et non sur un bord)
   * => si oui, on ouvre la grille associée
   */
  /******  cc2f2d1b-9235-4e10-9bad-af25085171a5  *******/
}

function projectManager(ctx) {
  ctx.projet = document.querySelector(
    `.projects [data-target="${ctx.target}"]`
  );
  ctx.projet.classList.add("p-focus");
  ctx.scrollZone.scroll({
    top: ctx.projet.offsetTop,
    behavior: "instant",
  });
  ctx.video = ctx.projet.querySelector("video");
  const observer = new IntersectionObserver(
    ([e]) => {
      if (e.intersectionRatio < 1) {
        observer.disconnect();
        e.target.closest(".project").classList.remove("p-focus");
        ctx.scrollZone.scroll({
          top: ctx.projet.offsetTop,
          behavior: "instant",
        });
      }
    },
    { threshold: [1] }
  );
  observer.observe(ctx.video);
}
function openGrid({ grid, inner, scene }) {
  if (!inner) return;
  scene.classList.add("isOpen");
  animateWithKeyframe({
    el: inner,
    fromVal: "rotateY(0deg)",
    toVal: inner.closest(".left") ? "rotateY(-90deg)" : "rotateY(90deg)",
    fromWidth: 100,
    toWidth: 83.33,
    duration: g_duration,
    onDone: () => {
      isOpen = true;
      inner.style.transform = "rotateY(-90deg)";
      inner.style.width = "83.33%";
      focusOnGrid({
        gridElement: grid,
        desiredZ: -150,
        disableScroll: true,
        scene,
      });
    },
  });
}

function closeScroll({ grid, inner, scene }) {
  // console.log(inner);
  // const scrollZone = inner.querySelector(".inner-container");
  // if (!scrollZone) {
  //   closeGrid({ grid, inner, scene });
  //   return;
  // }
  // // On vérifie si c'est déjà scrollTop=0
  // if (scrollZone.scrollTop !== 0) {
  //   scrollZone.scrollTo({ top: 0, behavior: "smooth" });
  //   const checkScrollTop = () => {
  //     if (scrollZone.scrollTop === 0) {
  //       scrollZone.removeEventListener("scroll", checkScrollTop);
  //       closeGrid({ grid, inner, scene });
  //     }
  //   };
  //   scrollZone.addEventListener("scroll", checkScrollTop, { passive: true });
  // } else {
  //   closeGrid({ grid, inner, scene });
  // }
}

function closeGrid({ grid, inner, scene }) {
  setTimeout(() => {
    scene.classList.remove("isOpen");
  }, g_duration);

  animateWithKeyframe({
    el: inner,
    fromVal: inner.closest(".left") ? "rotateY(-90deg)" : "rotateY(90deg)",
    toVal: "rotateY(0deg)",
    fromWidth: 83.33,
    toWidth: 100,
    duration: g_duration,
    onDone: () => {
      isOpen = false;
      inner.style.transform = "";
      inner.style.width = "100%";
      toggleVideo(inner); // Pause vidéo
      simulateScroll(-100);
      grid.classList.remove("active");
    },
  });
}

/***************************************************
 * 9) AnimateWithKeyframe
 ***************************************************/
function animateWithKeyframe({
  el,
  fromVal,
  toVal,
  fromWidth = 100,
  toWidth = 100,
  duration = 100,
  onDone,
}) {
  const animName = "anim_" + Math.floor(Math.random() * 999999);
  const styleEl = document.createElement("style");
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

  el.style.animation = `${animName} ${duration}ms forwards ease`;

  function finish() {
    el.style.animation = "";
    styleEl.remove();
    if (typeof onDone === "function") onDone();
  }
  setTimeout(finish, duration);
}

/***************************************************
 * 10) simulateScroll
 ***************************************************/
function simulateScroll(deltaY) {
  const delta = deltaY * scrollFactor;
  scrollDirection = delta > 0 ? "down" : "up";

  scrollDepth += delta;
  if (scrollDepth > 0) scrollDepth = 0;

  document.documentElement.style.setProperty(
    "--scroll-depth",
    `${-scrollDepth}vw`
  );
  detectOutOfFrame(scrollDirection);
}

/***************************************************
 * 11) GESTION DES VIDEOS (hover)
 ***************************************************/
const miniVideos = document.querySelectorAll(".grid video");
miniVideos.forEach((vid) => {
  vid.loop = true;
  vid.muted = true;
  vid.addEventListener("mouseenter", handleVideoMouseEnter);
  vid.addEventListener("mouseleave", handleVideoMouseLeave);
});

function manageCoverVideo() {
  const videos = document.querySelectorAll(".hidden-video");

  videos.forEach((video) => {
    video.addEventListener(
      "canplaythrough",
      () => {
        video.classList.remove("hidden-video");
        video.closest(".video-container").style.backgroundImage = "none";
      },
      { once: true }
    );
  });
}

function handleVideoMouseEnter(e) {
  const vid = e.target;
  if (!(vid instanceof HTMLVideoElement)) return;

  if (currentPlayingVideo && currentPlayingVideo !== vid) {
    currentPlayingVideo.pause();
    currentPlayingVideo = null;
  }
  vid.play().catch((err) => console.log("Impossible de lancer la vidéo:", err));
  currentPlayingVideo = vid;
}

function handleVideoMouseLeave(e) {
  const vid = e.target;
  if (!(vid instanceof HTMLVideoElement)) return;
  const gridParent = vid.closest(".grid");
  if (!gridParent) return;

  if (!gridParent.classList.contains("active")) {
    vid.pause();
    if (currentPlayingVideo === vid) {
      currentPlayingVideo = null;
    }
  }
}

/***************************************************
 * 12) updateVideoScale : ex. ratio
 ***************************************************/
function updateVideoScale() {
  const container = document.querySelector(".grid .inner");
  if (!container) return;
  const w = container.offsetWidth;
  const h = container.offsetHeight;

  const ratioVideo = 3 / 4; // ex: 0.75
  const ratioContainer = w / h;
  let scaleNeeded;
  if (ratioVideo > ratioContainer) {
    scaleNeeded = ratioVideo / ratioContainer;
  } else {
    scaleNeeded = ratioContainer / ratioVideo;
  }
  if (scaleNeeded < 1) scaleNeeded = 1;

  document.documentElement.style.setProperty("--vidScale", scaleNeeded);
}
