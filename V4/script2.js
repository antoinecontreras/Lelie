
/***************************************************
 * 2) Variables globales
 ***************************************************/
let SCROLLDEPTH = 0; 
let SCROLLFACTOR = 0.1;
let LASTCHECKTIME = 0;
let SCROLLDIRECTION = "down";



// Grilles left/right
const SETTINGS = {
  MARGINCLICK: 20, // pour la détection de clic sur les bords
  SCROLL_FACTOR_DESKTOP: 0.1,
  SCROLL_FACTOR_MOBILE: 1.5,
  FRICTION: 0.92,
  G_DURATION: 600,
  THRESHOLD_UP: 3000,
  THRESHOLD_DOWN_MAX: -2500,
  THRESHOLD_DOWN_MIN: -3500,
};

const GRIDS = {
  right: document.querySelectorAll(".right .grid"),
  left: document.querySelectorAll(".left .grid"),
  total: document.querySelectorAll(".right .grid").length,
};

// Contrôle du scroll + ouvertures

let STARTY = 0;
let VELOCITY = 0; 
let IS_TOUCHING = false;
let IS_SCROLLING = true;
let IS_OPEN = false;
let OPENED_GRID = null; 

// Vidéos
let CURRENT_PLAYING_VIDEO = null;

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


/* Resize => updateVideoScale si besoin */
window.addEventListener("resize", updateVideoScale);
document.addEventListener("DOMContentLoaded", manageCoverVideo, {
  passive: true,
});
/* Au load, on peut init nos vidéos, etc. */
window.addEventListener(
  "load",
  () => {
    initEventListeners();

    const vids = document.querySelectorAll("video");
    vids.forEach((vid) => {
      vid.autoplay = false;
      vid.defaultMuted = false;
    });
    updateVideoScale();
  },
  { passive: true }
);
function initEventListeners() {
  // 1) Détection device
  const isHoverableDevice = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;
  SCROLLFACTOR = isHoverableDevice ? SETTINGS.SCROLL_FACTOR_DESKTOP : SETTINGS.SCROLL_FACTOR_MOBILE;

  // 2) Desktop ou Mobile
  if (isHoverableDevice) {
    console.log("---DESKTOP---");
    window.addEventListener("wheel", handleWheelEvent, { passive: false });
    window.addEventListener("click", handleClick, { passive: false });
  } else {
    console.log("---MOBILE---");
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });
  }

  // 3) Resize => updateVideoScale
  window.addEventListener("resize", updateVideoScale);

  // 4) Gérer la coverVideo
  manageCoverVideo();
}
function focusOnGrid(ctx) {
  // gridElement, desiredZ, disableScroll = false, scene
  const transform = getComputedStyle(ctx.gridElement).transform;
  if (!transform || transform === "none") {
    console.warn("Grille sans transform calculé.");
    return;
  }

  const matrix = createMatrix(transform);
  if (!matrix) return;

  // Calcul en pourcentage (vw)
  const zValue = (matrix.m43 / window.innerWidth) * 100;
  const offset = zValue - ctx.desiredZ;

  SCROLLDEPTH += offset;
  if (SCROLLDEPTH > 0) SCROLLDEPTH = 0;

  ctx.scene.classList.add("allActive");

  document.documentElement.style.setProperty(
    "--scroll-depth",
    `${-SCROLLDEPTH}vw`
  );

  setTimeout(() => {
    ctx.scene.classList.remove("allActive");
    projectManager({
      target: ctx.gridElement.dataset.ref,
      scrollZone: document.querySelector(".projects"),
    });
    const vid = ctx.gridElement.querySelector("video");
    if (vid && vid.paused) {
      vid.play().catch((err) => console.log("Vid play error:", err));
      CURRENT_PLAYING_VIDEO = vid;
    }
  }, SETTINGS.G_DURATION);

  if (ctx.disableScroll) {
    isScrolling = false;
  }
}

function toggleVideo(gridElement) {
  const vid = gridElement.querySelector("video");
  if (vid && !vid.matches(":hover")) vid.pause();
  isScrolling = true;
}

function projectManager(ctx) {
  ctx.projects = document.querySelector(`.projects`);
  ctx.projects.classList.add("open_projects");
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

  if (CURRENT_PLAYING_VIDEO && CURRENT_PLAYING_VIDEO !== vid) {
    CURRENT_PLAYING_VIDEO.pause();
    CURRENT_PLAYING_VIDEO = null;
  }
  vid.play().catch((err) => console.log("Impossible de lancer la vidéo:", err));
  CURRENT_PLAYING_VIDEO = vid;
}

function handleVideoMouseLeave(e) {
  const vid = e.target;
  if (!(vid instanceof HTMLVideoElement)) return;
  const gridParent = vid.closest(".grid");
  if (!gridParent) return;

  if (!gridParent.classList.contains("active")) {
    vid.pause();
    if (CURRENT_PLAYING_VIDEO === vid) {
      CURRENT_PLAYING_VIDEO = null;
    }
  }
}
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
