/*
  Browser checks for the code-review fixes on the inner pages.
  Paste into the console of any page served by `vite preview` (or run it
  through a browser automation tool). Returns { passed, failed, results }.
  Each check loads a page in a hidden iframe so it runs against real markup.
*/
(async () => {
  // `transform` (optional) rewrites the page HTML before it loads.
  const load = async (page, width = 1280, transform) => {
    const f = document.createElement("iframe");
    f.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:900px;border:0;visibility:hidden`;
    if (transform) {
      const html = await (await fetch(`${page}.html`)).text();
      f.srcdoc = transform(html).replace("<head>", `<head><base href="${new URL(".", location.href).href}">`);
    } else {
      f.src = `${page}.html`;
    }
    document.body.append(f);
    await new Promise((r) => (f.onload = r));
    await new Promise((r) => setTimeout(r, 500));
    return f;
  };
  const wait = (ms = 200) => new Promise((r) => setTimeout(r, ms));
  const results = [];
  const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

  // 1. gallery arrows visible on touch screens (hover: none)
  {
    const f = await load("meetings");
    const css = [...f.contentDocument.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } });
    const touchRule = css.some((r) => r.media && /hover:\s*none/.test(r.media.mediaText) && /fx-gal__btn/.test(r.cssText) && /opacity:\s*1/.test(r.cssText));
    check("gallery arrows shown on touch devices", touchRule);
    f.remove();
  }

  // 2. gallery accessibility: live counter + inactive photos hidden from screen readers
  {
    const f = await load("meetings");
    const g = f.contentDocument.querySelector("[data-gal]");
    g.querySelector("[data-gal-next]").click();
    const count = g.querySelector("[data-gal-count]");
    const imgs = [...g.querySelectorAll("img")];
    check("gallery counter is aria-live", count.getAttribute("aria-live") === "polite");
    check("inactive gallery photos are aria-hidden", imgs.filter((i) => !i.classList.contains("is-on")).every((i) => i.getAttribute("aria-hidden") === "true") && imgs.find((i) => i.classList.contains("is-on")).getAttribute("aria-hidden") !== "true");
    f.remove();
  }

  // 3. carousel counter reaches the last page when cards do not divide evenly
  {
    const f = await load("offers");
    const d = f.contentDocument;
    const track = d.querySelector("[data-car-track]");
    track.append(track.firstElementChild.cloneNode(true)); // 7 cards, 3 per page -> 3 pages
    track.style.scrollBehavior = "auto";
    track.scrollLeft = track.scrollWidth;
    track.dispatchEvent(new Event("scroll"));
    await wait(300);
    check("carousel shows last page at the end", d.querySelector("[data-car-count]").textContent.trim() === "3 / 3", d.querySelector("[data-car-count]").textContent);
    f.remove();
  }

  // 4. filter keys with a hyphen (data-f-select="room-type") match data-room-type
  {
    // rename the city filter to "hotel-city" on the real hotels page
    const f = await load("hotels", 1280, (html) => html
      .replace('data-f-select="city"', 'data-f-select="hotel-city"')
      .replaceAll(' data-city="', ' data-hotel-city="'));
    const d = f.contentDocument;
    const sel = d.querySelector('[data-f-select="hotel-city"]');
    sel.value = "jakarta";
    sel.dispatchEvent(new Event("change"));
    await wait();
    const shown = [...d.querySelectorAll(".fx-hcard")].filter((i) => !i.hidden).length;
    check("hyphenated filter key matches", shown === 2, `${shown} shown, expected 2`);
    f.remove();
  }

  // 5. show more reveals card photos too (no photo left clipped)
  {
    const f = await load("hotels");
    const d = f.contentDocument;
    d.querySelector("[data-f-more]").click();
    await wait();
    const lastCard = [...d.querySelectorAll(".fx-hcard")].filter((c) => !c.hidden).at(-1);
    const clipped = [...lastCard.querySelectorAll("[data-r]")].filter((el) => !el.classList.contains("in"));
    check("show more reveals nested reveal elements", lastCard.classList.contains("in") && clipped.length === 0);
    f.remove();
  }

  // 6. menu button label follows state
  {
    const f = await load("hotels", 375);
    const d = f.contentDocument;
    const btn = d.querySelector(".menu-toggle");
    btn.click();
    const openLabel = btn.getAttribute("aria-label");
    d.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    check("menu button says close when open, open when closed", openLabel === "Close menu" && btn.getAttribute("aria-label") === "Open menu", openLabel);
    f.remove();
  }

  const failed = results.filter((r) => !r.ok);
  return { passed: results.length - failed.length, failed: failed.length, results };
})();
