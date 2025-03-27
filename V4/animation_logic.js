function handleClick(e) {
    const scene = document.querySelector(".scene");
    const grid = e.target.closest(".grid");
    const inner = e.target.closest(".inner");
    if (!grid) return;
  

  
    // Si pas encore ouvert
    if (!IS_OPEN && inner) {
      grid.classList.add("active");
      openGrid({ grid, inner, scene });
      OPENED_GRID = { grid, inner };
  
   
    }
    // sinon si c'est déjà ouvert => on ferme
    else if (IS_OPEN && OPENED_GRID.grid === grid) {
      // Vérifie si on clique sur bord => on ferme
      const wiSe = window.innerWidth;
      const marClck = (SETTINGS.MARGINCLICK * wiSe) / 100;
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
          gridElement: grid,
          desiredZ: -150,
          disableScroll: true,
          scene,
        });
     
      },
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
      },
    });
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