
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
	console.log(SCROLLDEPTH);

	SCROLLDEPTH += Math.round(delta);
	if (SCROLLDEPTH > 0) {
		SCROLLDEPTH = 0;
	}
	// SCROLLDEPTH = parseFloat(localStorage.getItem("scrollDepth")) || 0;

	document.documentElement.style.setProperty(
		"--scroll-depth",
		`parseFloat(SCROLLDEPTH)vw` // `${-SCROLLDEPTH}vw`
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
	const _forceReflow = gridEl.offsetHeight;

	// Lance la transition
	gridEl.style.transform = finalTransform;
	gridEl.style.transition = `transform ${SETTINGS.G_DURATION / 2}ms linear`;

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
