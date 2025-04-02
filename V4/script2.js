/***************************************************
 * 2) Variables globales
 ***************************************************/
let SCROLLDEPTH = 0.1;
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
	THRESHOLD_DOWN_MIN: -3500
};

const GRIDS = {
	right: document.querySelectorAll(".right .grid"),
	left: document.querySelectorAll(".left .grid"),
	total: document.querySelectorAll(".right .grid").length
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

window.addEventListener(
	"DOMContentLoaded",
	() => {

		initEventListeners();
	},
	{passive: true}
);
window.addEventListener(
	"load",
	() => {
		const vids = document.querySelectorAll("video");
		vids.forEach(vid => {
			vid.autoplay = false;
			vid.defaultMuted = false;
		});
		manageCoverVideo();
		setTimeout(updateVideoScale, 500); // exécute après la pile courante	
		
		document.querySelector(".scene").style.opacity = "";
		
	},
	{ passive: true }
);
function initEventListeners() {
	// 1) Détection device
	const isHoverableDevice = window.matchMedia(
		"(hover: hover) and (pointer: fine)"
	).matches;
	SCROLLFACTOR = isHoverableDevice
		? SETTINGS.SCROLL_FACTOR_DESKTOP
		: SETTINGS.SCROLL_FACTOR_MOBILE;

	// 2) Desktop ou Mobile
	if (isHoverableDevice) {
		console.log("---DESKTOP---");
		window.addEventListener("wheel", handleWheelEvent, { passive: false });
		window.addEventListener("click", handleClick, { passive: false });
	} else {
		console.log("---MOBILE---");
		window.addEventListener("touchstart", handleTouchStart, {
			passive: false
		});
		window.addEventListener("touchmove", handleTouchMove, {
			passive: false
		});
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
	const zValue = matrix.m43 / window.innerWidth * 100;
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
			scrollZone: document.querySelector(".projects")
		});
		const vid_t = ctx.gridElement.querySelector("video");
		if (vid_t) vid_t.pause();
		// if (vid && vid.paused) {
		// 	vid.play().catch(err => console.log("Vid play error:", err));
		// 	CURRENT_PLAYING_VIDEO = vid;
		// }
	}, SETTINGS.G_DURATION);

	if (ctx.disableScroll) {
		IS_SCROLLING = false;
	}
}

function toggleVideo(gridElement) {
	const vid = gridElement.querySelector("video");
	if (vid && !vid.matches(":hover")) vid.pause();
	IS_SCROLLING = true;
}

function projectManager(ctx) {
	ctx.projects = document.querySelector(`.projects`);
	ctx.projects.classList.add("open_projects");
	ctx.projet = document.querySelector(
		`.projects [data-target="${ctx.target}"]`
	);
	ctx.projet.classList.add("p-focus");
	ctx.project_all = ctx.projects.querySelectorAll(".project");
	ctx.beside_target = [...ctx.project_all]
		.map((e, index) => (index < ctx.target ? { el: e, hidden: true } : e))
		.filter(e => e.hidden)
		.map(e => {
			e.el.style.display = "none";
			return e.el;
		});

	ctx.scrollZone.scroll({
		top: ctx.projet.offsetTop,
		behavior: "instant"
	});
	ctx.video = ctx.projet.querySelector("video");
	const videosObserver = new IntersectionObserver(
		entries => {
			entries.forEach(entry => {
				const video = entry.target.querySelector("video");
				if (video) {
					if (entry.isIntersecting) {
						video
							.play()
							.catch(err => console.log("Vid play error:", err));
					} else {
						video.pause();
					}
				}
			});
		},
		{ threshold: [0.5] }
	);
	ctx.project_all.forEach(project => {
		videosObserver.observe(project);
	});
	const observer = new IntersectionObserver(
		([e]) => {
			console.log("Intersection Ratio:");
			if (e.intersectionRatio < 1) {
				console.log("inside IF");
				observer.disconnect();
				ctx.beside_target.forEach(e => {
					e.style.display = "";
				});
				e.target.closest(".project").classList.remove("p-focus");
				ctx.scrollZone.scroll({
					top: ctx.projet.offsetTop,
					behavior: "instant"
				});
			}
		},
		{ threshold: [1] }
	);
	console.log(ctx.video);
	observer.observe(ctx.video);
}

const miniVideos = document.querySelectorAll(".grid video");
miniVideos.forEach(vid => {
	vid.loop = true;
	vid.muted = true;
	vid.addEventListener("mouseenter", handleVideoMouseEnter);
	vid.addEventListener("mouseleave", handleVideoMouseLeave);
});

function manageCoverVideo() {
	const videos = document.querySelectorAll(".hidden-video");

	videos.forEach(video => {
		video.addEventListener(
			"canplaythrough",
			() => {
				video.classList.remove("hidden-video");
				video.closest(".video-container").style.backgroundImage =
					"none";
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
	vid.play().catch(err => console.log("Impossible de lancer la vidéo:", err));
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



// SCROLL LOGIC
//////////////////////////////////////////////
function handleWheelEvent(e) {
	if (!IS_SCROLLING) return;
	if (e.preventDefault) e.preventDefault();
	let deltaY = e.deltaY;
	if (typeof deltaY === "undefined") {
		deltaY = -e.wheelDelta || e.detail;
	}

	const delta = deltaY * SCROLLFACTOR;
	SCROLLDIRECTION = delta > 0 ? "down" : "up";

	SCROLLDEPTH += Math.round(delta);
	if (SCROLLDEPTH > 0) {
		SCROLLDEPTH = 0;
	}
	// SCROLLDEPTH = parseFloat(localStorage.getItem("scrollDepth")) || 0;

	document.documentElement.style.setProperty(
		"--scroll-depth",
		 `${-SCROLLDEPTH}vw`
	);

	const now = Date.now();
	if (now - LASTCHECKTIME > 300) {
		detectOutOfFrame(SCROLLDIRECTION);
		LASTCHECKTIME = now;
	}
}
function inertiaLoop() {
	if (IS_TOUCHING) return;

	// On “freine” la vitesse
	VELOCITY *= SETTINGS.FRICTION;

	// Applique la vitesse freinée au SCROLLDEPTH
	SCROLLDEPTH += VELOCITY;

	// Bloque si on dépasse le “haut”
	if (SCROLLDEPTH > 0) {
		SCROLLDEPTH = 0;
		VELOCITY = 0;
	}
	document.documentElement.style.setProperty(
		"--scroll-depth",
		`${-SCROLLDEPTH}vw`
	);

	// Détection hors-champ
	// (On peut le faire moins souvent si on veut)
	if (Math.abs(VELOCITY) > 0.01) {
		// continue tant qu'on a de la vitesse
		const dir = VELOCITY > 0 ? "down" : "up";
		const now = Date.now();
		if (now - LASTCHECKTIME > 300) {
			detectOutOfFrame(dir);
			LASTCHECKTIME = now;
		}
		requestAnimationFrame(inertiaLoop);
	} else {
		// Vitesse trop faible => on arrête
		VELOCITY = 0;
	}
}
function handleTouchStart(e) {
	if (e.touches.length === 1) {
		STARTY = e.touches[0].clientY;
		IS_TOUCHING = true;
		VELOCITY = 0;
	}
}
function handleTouchMove(e) {
	if (!IS_TOUCHING) return;
	e.preventDefault();

	if (e.touches.length === 1) {
		let currentY = e.touches[0].clientY;
		let deltaY = STARTY - currentY;
		// STARTY - currentY => si positif, on “descend” => direction = "down"

		// On définit la vitesse instantanée
		// (plus tard, on laissera la SETTINGS.FRICTION l'atténuer)
		VELOCITY = deltaY * SCROLLFACTOR;

		// On applique immédiatement cette vitesse à SCROLLDEPTH
		SCROLLDEPTH += VELOCITY;
		if (SCROLLDEPTH > 0) {
			SCROLLDEPTH = 0;
		}

		document.documentElement.style.setProperty(
			"--scroll-depth",
			`${-SCROLLDEPTH}vw`
		);

		// Détection hors-champ (limité par LASTCHECKTIME)
		const now = Date.now();
		if (now - LASTCHECKTIME > 300) {
			const SCROLLDIRECTION = deltaY > 0 ? "down" : "up";
			detectOutOfFrame(SCROLLDIRECTION);
			LASTCHECKTIME = now;
		}

		// Met à jour STARTY
		STARTY = currentY;
	}
}
function handleTouchEnd(e) {
	IS_TOUCHING = false;
	requestAnimationFrame(inertiaLoop);
}

function detectOutOfFrame(direction) {
	GRIDS.right.forEach(gridRight => {
		const transform = getComputedStyle(gridRight).transform;
		if (transform && transform !== "none") {
			const matrix = createMatrix(transform);
			if (!matrix) return;
			const zValue = matrix.m43;

			if (direction === "up" && zValue > SETTINGS.THRESHOLD_UP) {
				repositionUp(gridRight);
			} else if (
				direction === "down" &&
				zValue < SETTINGS.THRESHOLD_DOWN_MAX &&
				zValue > SETTINGS.THRESHOLD_DOWN_MIN
			) {
				// On récupère la grille la plus "lointaine"
				const targetSnap = Math.max(
					...[...GRIDS.right].map(g => Number(g.dataset.snap))
				);
				const targetGrid = [...GRIDS.right].find(
					g => Number(g.dataset.snap) === targetSnap
				);
				repositionDown(targetGrid);
			}
		}
	});
}
function repositionUp(gridRight) {
	const oldSnap = Number(gridRight.dataset.snap);
	const newSnap = oldSnap + GRIDS.total;
	repositionGrid(gridRight, newSnap, "right", false);

	const leftIndex =
		(newSnap % GRIDS.left.length + GRIDS.left.length) % GRIDS.left.length;
	const gridLeft = GRIDS.left[leftIndex];
	if (!gridLeft) return;
	repositionGrid(gridLeft, newSnap, "left", false);
}

function repositionDown(gridRight) {
	const oldSnap = Number(gridRight.dataset.snap);
	const newSnap = oldSnap - GRIDS.right.length;
	repositionGrid(gridRight, newSnap, "right", false);

	const leftIndex =
		(newSnap % GRIDS.left.length + GRIDS.left.length) % GRIDS.left.length;
	const gridLeft = GRIDS.left[leftIndex];
	if (!gridLeft) return;
	repositionGrid(gridLeft, newSnap, "left", false);
}
function repositionGrid(gridEl, newSnap, side, instant = false) {
	gridEl.dataset.snap = newSnap;
	const factor = -1 * newSnap;

	const baseTranslateX =
		side === "right"
			? "var(--base-translate-x)"
			: "var(--left-translate-x)";
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
	// const _forceReflow = gridEl.offsetHeight;

	// Lance la transition
	gridEl.style.transform = finalTransform;
	// gridEl.style.transition = `transform ${SETTINGS.G_DURATION / 2}ms linear`;
	gridEl.style.transition = `transform ${SETTINGS.G_DURATION / 3}ms ease-out`;

	setTimeout(() => {
		gridEl.style.transition = "";
	}, SETTINGS.G_DURATION);
}
function simulateScroll(deltaY) {
	const delta = deltaY * SCROLLFACTOR;
	SCROLLDIRECTION = delta > 0 ? "down" : "up";

	SCROLLDEPTH += delta;
	if (SCROLLDEPTH > 0) SCROLLDEPTH = 0;
	

	document.documentElement.style.setProperty(
		"--scroll-depth",
		`${-SCROLLDEPTH}vw`
	);
	detectOutOfFrame(SCROLLDIRECTION);
}
// ANIMATION LOGIC
//////////////////////////////////////////////

function handleClick(e) {
	const scene = document.querySelector(".scene");
	const grid = e.target.closest(".grid");
	const inner = e.target.closest(".inner");
	const close_btn = e.target.classList == "flat-content";

	close_btn ? close_projects({e,close_btn}) : null;
	if (!grid) return;
	// Si pas encore ouvert
	if (!IS_OPEN && inner) {
		grid.classList.add("active");
		openGrid({ grid, inner, scene });
		OPENED_GRID = { grid, inner };
	} else if (IS_OPEN && OPENED_GRID.grid === grid) {
		// sinon si c'est déjà ouvert => on ferme
		// Vérifie si on clique sur bord => on ferme
		const wiSe = window.innerWidth;
		const marClck = SETTINGS.MARGINCLICK * wiSe / 100;
		if (e.x < marClck || e.x > wiSe - marClck) {
			// closeScroll({ grid, inner, scene });
		}
	}
}
function close_projects(ctx) {
  if(ctx.e.x < ctx.e.innerWidth/2){
    console.log(  ctx.e.x);
    
  }

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
		duration: SETTINGS.G_DURATION,
		onDone: () => {
			IS_OPEN = true;
			inner.style.transform = "rotateY(-90deg)";
			inner.style.width = "83.33%";
			focusOnGrid({
				inner,
				gridElement: grid,
				desiredZ: -150,
				disableScroll: true,
				scene
			});
		}
	});
}
function closeGrid({ grid, inner, scene }) {
	setTimeout(() => {
		scene.classList.remove("isOpen");
	}, SETTINGS.G_DURATION);

	animateWithKeyframe({
		el: inner,
		fromVal: inner.closest(".left") ? "rotateY(-90deg)" : "rotateY(90deg)",
		toVal: "rotateY(0deg)",
		fromWidth: 83.33,
		toWidth: 100,
		duration: SETTINGS.G_DURATION,
		onDone: () => {
			IS_OPEN = false;
			inner.style.transform = "";
			inner.style.width = "100%";
			toggleVideo(inner); // Pause vidéo
			simulateScroll(-100);
			grid.classList.remove("active");
		}
	});
}
function animateWithKeyframe({
	el,
	fromVal,
	toVal,
	fromWidth = 100,
	toWidth = 100,
	duration = 100,
	onDone
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

