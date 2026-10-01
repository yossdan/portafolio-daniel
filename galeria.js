/* Renderiza las fotos y videos de proyectos.js. No necesitas editarlo. */
(() => {
  "use strict";

  const settings = window.proyectosMultimedia || {};
  const dialog = document.querySelector("#visor-imagen");
  const largeImage = document.querySelector("#visor-foto");
  const largeTitle = document.querySelector("#visor-titulo");

  // Acepta enlaces web y rutas relativas. No acepta código como URL.
  function safeURL(value, onlyWeb = false) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value.trim(), document.baseURI);
      const web = ["http:", "https:"].includes(url.protocol);
      const relative = !/^[a-z][a-z\d+.-]*:/i.test(value.trim());
      const local = location.protocol === "file:" && relative && url.protocol === "file:";
      return (web || (!onlyWeb && local)) ? url : null;
    } catch { return null; }
  }

  function describeMedia(entry) {
    const value = typeof entry === "string" ? { src: entry } : entry;
    if (!value || typeof value !== "object") return null;
    const url = safeURL(value.src);
    if (!url) return null;
    const host = url.hostname.toLowerCase();
    let youtubeId = null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      youtubeId = url.searchParams.get("v");
      if (!youtubeId && /^\/(embed|shorts|live)\//.test(url.pathname)) youtubeId = url.pathname.split("/")[2];
    } else if (host === "youtu.be" || host === "www.youtu.be") {
      youtubeId = url.pathname.split("/")[1];
    }
    if (youtubeId && /^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
      return { type: "youtube", src: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`, original: url.href, alt: value.alt };
    }
    const video = /\.(mp4|webm|ogv|ogg)$/i.test(url.pathname) || value.tipo === "video";
    return { type: video ? "video" : "image", src: url.href, original: url.href, alt: value.alt };
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function openImage(src, alt, caption) {
    largeImage.src = src;
    largeImage.alt = alt;
    largeTitle.textContent = caption;
    dialog.showModal();
    document.body.classList.add("visor-abierto");
  }

  if (dialog) {
    dialog.querySelector(".visor-cerrar").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.body.classList.remove("visor-abierto");
      largeImage.removeAttribute("src");
    });
  }

  document.querySelectorAll("[data-galeria]").forEach((gallery) => {
    const key = gallery.dataset.galeria;
    const config = settings[key] || {};
    const card = gallery.closest(".proyecto");
    const title = card.querySelector("h3").textContent;
    const demo = card.querySelector("[data-demo]");
    const demoURL = safeURL(config.demo, true);
    if (demo && demoURL) {
      demo.href = demoURL.href;
      demo.target = "_blank";
      demo.rel = "noopener noreferrer";
      demo.hidden = false;
    }
    const entries = Array.isArray(config.medios) ? config.medios : [];
    const media = entries.map(describeMedia).filter(Boolean);
    if (!media.length) return;

    gallery.replaceChildren();
    const stage = node("div", "galeria-escena");
    const bar = node("div", "galeria-barra");
    const status = node("p", "galeria-estado");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const arrows = node("div", "galeria-flechas");
    const previous = node("button", "", "←");
    previous.type = "button";
    previous.setAttribute("aria-label", `Vista anterior de ${title}`);
    const next = node("button", "", "→");
    next.type = "button";
    next.setAttribute("aria-label", `Vista siguiente de ${title}`);
    arrows.append(previous, next);
    bar.append(status, arrows);
    const selector = node("div", "galeria-selector");
    selector.setAttribute("role", "group");
    selector.setAttribute("aria-label", `Elegir vista de ${title}`);
    let active = 0;
    const selectors = media.map((item, index) => {
      const label = item.type === "image" ? "Foto" : "Video";
      const button = node("button", "", `${label} ${index + 1}`);
      button.type = "button";
      button.setAttribute("aria-label", `${label} ${index + 1} de ${title}`);
      button.addEventListener("click", () => show(index));
      selector.append(button);
      return button;
    });
    arrows.hidden = media.length < 2;
    selector.hidden = media.length < 2;
    gallery.append(stage, bar, selector);

    function show(index) {
      // Detiene el video anterior antes de cambiar de vista.
      const previousVideo = stage.querySelector("video");
      if (previousVideo) previousVideo.pause();
      active = (index + media.length) % media.length;
      const item = media[active];
      const currentIndex = active;
      const alt = typeof item.alt === "string" && item.alt.trim() ? item.alt : `Captura ${active + 1} del proyecto ${title}`;
      stage.replaceChildren();
      status.textContent = `${item.type === "image" ? "Foto" : "Video"} ${active + 1} de ${media.length}`;
      selectors.forEach((button, i) => button.setAttribute("aria-pressed", String(i === active)));

      function failed() {
        if (active !== currentIndex) return;
        const error = node("div", "galeria-error");
        error.append(node("p", "", "Esta vista no está disponible."));
        const link = node("a", "", "Abrir archivo");
        link.href = item.original;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        error.append(link);
        stage.replaceChildren(error);
      }

      if (item.type === "image") {
        const button = node("button", "galeria-ampliar");
        button.type = "button";
        button.setAttribute("aria-label", `Ampliar ${alt}`);
        const image = node("img");
        image.alt = alt;
        image.decoding = "async";
        image.addEventListener("error", failed, { once: true });
        image.src = item.src;
        button.append(image, node("span", "", "Ampliar ↗"));
        button.addEventListener("click", () => openImage(item.src, alt, `${title} · Foto ${active + 1} de ${media.length}`));
        stage.append(button);
      } else if (item.type === "video") {
        const video = node("video");
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.setAttribute("aria-label", `Demostración en video de ${title}`);
        video.append(document.createTextNode("Tu navegador no puede reproducir este video."));
        video.addEventListener("error", failed, { once: true });
        video.src = item.src;
        stage.append(video);
      } else {
        const iframe = node("iframe");
        iframe.src = item.src;
        iframe.title = `Video de ${title}`;
        iframe.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        stage.append(iframe);
      }
    }

    previous.addEventListener("click", () => show(active - 1));
    next.addEventListener("click", () => show(active + 1));
    show(0);
  });
})();
