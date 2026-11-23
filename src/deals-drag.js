import "./deals-drag.css";

const track = document.querySelector(".deals-showcase.is-drag-carousel .places-track");

if (track) {
  let startX = 0;
  let startScrollLeft = 0;
  let moved = false;

  const stopDragging = (event) => {
    if (!track.classList.contains("is-dragging")) return;
    track.classList.remove("is-dragging");
    if (event?.pointerId !== undefined && track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }
  };

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    startX = event.clientX;
    startScrollLeft = track.scrollLeft;
    moved = false;
    track.classList.add("is-dragging");
    track.setPointerCapture(event.pointerId);
  });

  track.addEventListener("pointermove", (event) => {
    if (!track.classList.contains("is-dragging")) return;
    const distance = event.clientX - startX;
    if (Math.abs(distance) > 5) moved = true;
    track.scrollLeft = startScrollLeft - distance;
  });

  track.addEventListener("pointerup", stopDragging);
  track.addEventListener("pointercancel", stopDragging);
  track.addEventListener("lostpointercapture", stopDragging);

  track.addEventListener("click", (event) => {
    if (!moved) return;
    event.preventDefault();
    event.stopPropagation();
    moved = false;
  }, true);

  track.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    track.scrollBy({ left: event.key === "ArrowRight" ? 368 : -368, behavior: "smooth" });
  });
}
