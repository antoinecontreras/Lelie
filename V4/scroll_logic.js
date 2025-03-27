function handleWheelEvent(e) {
    if (!isScrolling) return;
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
    if (!isScrolling) return;
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
    GRIDS.right.forEach((gridRight) => {
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
            ...[...GRIDS.right].map((g) => Number(g.dataset.snap))
          );
          const targetGrid = [...GRIDS.right].find(
            (g) => Number(g.dataset.snap) === targetSnap
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
      ((newSnap % GRIDS.left.length) + GRIDS.left.length) % GRIDS.left.length;
    const gridLeft = GRIDS.left[leftIndex];
    if (!gridLeft) return;
    repositionGrid(gridLeft, newSnap, "left", false);
  }
  
  function repositionDown(gridRight) {
    const oldSnap = Number(gridRight.dataset.snap);
    const newSnap = oldSnap - GRIDS.right.length;
    repositionGrid(gridRight, newSnap, "right", false);
  
    const leftIndex =
      ((newSnap % GRIDS.left.length) + GRIDS.left.length) % GRIDS.left.length;
    const gridLeft = GRIDS.left[leftIndex];
    if (!gridLeft) return;
    repositionGrid(gridLeft, newSnap, "left", false);
  }
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