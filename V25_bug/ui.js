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
      scene: document.querySelector(".scene"),
      pj: document.querySelector("div.projects"),
      canvas : document.querySelector("#canvasForHTML"),
    };
    dom.pj.classList.remove("loading");
    document.addEventListener("click", (e) => {
      let clickMode = CANVAS_LAYER.s.clickMode;
      // console.log(CANVAS_LAYER.s.visualIndex);
      replaceCanvas(CANVAS_LAYER.s.visualIndex);
      if (!clickMode) return;
      // dom.canvas.scrollIntoView({ behavior: "instant", block: "center" });
      // dom.scene.style.visibility = "visible";
    });
    // document.addEventListener("")
    replaceCanvas = (idx) => {
      const target = dom.pj.querySelector(`.project:nth-child(${idx})`)
      // console.log(target);
      if (target) {
      
      const targetParent = target.parentNode;
      targetParent.insertBefore(dom.canvas, target.nextSibling);
      // Scroll to the canvas element
      dom.canvas.scrollIntoView({ behavior: "instant", block: "center" });
      }
    };
  });
})();
