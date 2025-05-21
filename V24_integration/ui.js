// ui.js
// Version ultra-simple: instanciation de CanvasManager et gestion basique du click-mode via CustomEvents

(function () {
  // Helper pour DOMContentLoaded
  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  ready(function () {
    // 1. Instanciation du CanvasManager
    let CANVAS_LAYER = new CanvasManager();
    let dom = {
        scene : document.querySelector(".scene"),
        pj : document.querySelector("div.projects"),
    }
    dom.pj.classList.remove("loading")
    document.addEventListener("click", e => {
        
        let clickMode = CANVAS_LAYER.s.clickMode;
        if(!clickMode) return;
            dom.scene.style.visibility = "visible"
        console.log(clickMode);
    })
    // document.addEventListener("")
    
  });
})();
