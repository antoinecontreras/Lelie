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
      pages: document.querySelectorAll("div.projects >.project"),
      canvas: document.querySelector("#canvasForHTML"),
      baseScroll: 0,
    };
    dom.pj.classList.remove("loading");

    dom.pj.addEventListener("scroll", (e) => {
      if (dom.baseScroll > e.target.scrollTop) {
        e.preventDefault();
        e.target.scrollTo({
          top: dom.baseScroll,
          behavior: "instant",
        });
      }
    });

    document.addEventListener("click", (e) => {
      const event = e; // Capture the event
      setTimeout(() => {
        // Remove the event parameter from setTimeout

        // console.log("click", e.target);
        let clickMode = CANVAS_LAYER.s.clickMode;
        const target = dom.pj.querySelector(
          `.projects .project#${"t" + CANVAS_LAYER.s.visualIndex}`
        );

        // console.log(CANVAS_LAYER.s.visualIndex);

        // if (clickMode && e.target.classList.contains("canvas-container")) {
        if (clickMode && e.target.classList.contains("canvas-container")) {
          // console.log("clickMode is false");
          // dom.canvas.classList.add("scrollMode");
          console.log(target);
          target.classList.add("scrollMode");
          if (target) replaceCanvas(target);
          return;
        }

        if (event.target == dom.canvas) {
                    // dom.pj.scrollIntoView(dom.baseScroll);
                    target.scrollTo({top:0, behavior: "instant"});
          dom.pages.forEach((el) => el.classList.remove("scrollMode"));
          //  target.classList.remove("scrollMode");
          // dom.pj.scrollIntoView(dom.baseScroll);

          // dom.canvas.scrollIntoView({ behavior: "instant", block: "center" });
          // dom.canvas.classList.remove("scrollMode");
          // dom.scene.style.visibility = "visible";
        }
      }, 1);
    });

    // document.addEventListener("")
    replaceCanvas = (target) => {
      const targetParent = target.parentNode;
      targetParent.insertBefore(dom.canvas, target);
      dom.canvas.scrollIntoView({ behavior: "instant", block: "center" });
      const canvasRect = dom.canvas.getBoundingClientRect();
      const parentRect = dom.pj.getBoundingClientRect();
      dom.baseScroll = canvasRect.top - parentRect.top + dom.pj.scrollTop;
    };
  });
})();
