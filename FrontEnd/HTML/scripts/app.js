const dispatchFiles = [
  "pawbert.json",
  "gary.json",
  "george.json",
  "titus.json",
  "standout.json",
];

const state = {
  dispatches: [],
  activeId: null,
};

const appRoot = document.querySelector("#app");
const navRoot = document.querySelector("#module-nav");
const navButtonTemplate = document.querySelector("#nav-button-template");

init();

async function init() {
  try {
    const dispatches = await Promise.all(
      dispatchFiles.map(async (fileName) => {
        const dispatch = await loadDispatch(fileName);
        return dispatch;
      }),
    );

    state.dispatches = dispatches;
    state.activeId = getInitialId(dispatches);
    renderNav();
    renderActiveModule();
    window.addEventListener("hashchange", handleHashChange);
  } catch (error) {
    appRoot.innerHTML = `
      <section class="loading-state">
        <p>Unable to load the dispatch data. Open the page through a local server and check the browser console for the exact JSON path that failed.</p>
      </section>
    `;
    console.error(error);
  }
}

function renderNav() {
  navRoot.innerHTML = "";

  state.dispatches.forEach((dispatch) => {
    const fragment = navButtonTemplate.content.cloneNode(true);
    const link = fragment.querySelector(".nav-button");

    fragment.querySelector(".nav-kicker").textContent = dispatch.kicker;
    fragment.querySelector(".nav-title").textContent = dispatch.title;

    link.dataset.id = dispatch.id;
    link.href = `#${dispatch.id}`;
    link.title = `${dispatch.title} (${dispatch.sourceFile})`;

    if (dispatch.id === state.activeId) {
      link.classList.add("active");
    }

    navRoot.appendChild(fragment);
  });
}

function renderActiveModule() {
  const dispatch = state.dispatches.find(({ id }) => id === state.activeId);
  if (!dispatch) {
    return;
  }

  const mediaItems = Array.isArray(dispatch.media) ? dispatch.media : [];

  const comparisonMarkup = Array.isArray(dispatch.comparison)
    ? `
      <section class="comparison-panel">
        <h3>Closing Ledger</h3>
        ${dispatch.comparison
          .map(
            (item) => `
              <article class="comparison-card">
                <h4>${escapeHtml(item.name)}</h4>
                <span class="comparison-position">${escapeHtml(item.position)}</span>
                <p>${escapeHtml(item.reason)}</p>
              </article>
            `,
          )
          .join("")}
      </section>
    `
    : "";

  appRoot.innerHTML = `
    <article class="module-view">
      <header class="hero">
        <span class="module-kicker">${escapeHtml(dispatch.kicker)}</span>
        <h2>${escapeHtml(dispatch.title)}</h2>
        <p class="tagline">${escapeHtml(dispatch.tagline)}</p>
      </header>

      <p class="summary">${escapeHtml(dispatch.summary)}</p>

      <section class="highlights">
        ${dispatch.highlights
          .map(
            (item, index) => `
              <article class="highlight-card">
                <strong>Thread ${index + 1}</strong>
                <span>${escapeHtml(item)}</span>
              </article>
            `,
          )
          .join("")}
      </section>

      <div class="main-grid">
        <section class="section-stack">
          ${dispatch.sections
            .map(
              (section) => `
                <article class="section-card">
                  <h3>${escapeHtml(section.heading)}</h3>
                  ${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                </article>
              `,
            )
            .join("")}
        </section>

        <aside class="media-panel">
          <h3>Field Notes & Media</h3>
          ${mediaItems
            .map((item) => {
              if (item.type === "video") {
                return `
                  <article class="media-card">
                    <figure>
                      <video controls preload="metadata" aria-label="${escapeHtml(item.alt)}">
                        <source src="${escapeAttribute(item.src)}" type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      <figcaption>${escapeHtml(item.caption)}</figcaption>
                    </figure>
                  </article>
                `;
              }

              return `
                <article class="media-card">
                  <figure>
                    <img src="${escapeAttribute(item.src)}" alt="${escapeAttribute(item.alt)}" loading="lazy" />
                    <figcaption>${escapeHtml(item.caption)}</figcaption>
                  </figure>
                </article>
              `;
            })
            .join("")}
          ${comparisonMarkup}
        </aside>
      </div>
    </article>
  `;
}

function getInitialId(dispatches) {
  const hashId = window.location.hash.slice(1);
  if (hashId && dispatches.some(({ id }) => id === hashId)) {
    return hashId;
  }

  return dispatches[0]?.id ?? null;
}

function handleHashChange() {
  const hashId = window.location.hash.slice(1);
  if (!hashId || hashId === state.activeId) {
    return;
  }

  if (!state.dispatches.some(({ id }) => id === hashId)) {
    return;
  }

  state.activeId = hashId;
  renderNav();
  renderActiveModule();
}

async function loadDispatch(fileName) {
  const candidateUrls = getDispatchCandidateUrls(fileName);
  const failures = [];

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        failures.push(`${url} -> ${response.status}`);
        continue;
      }

      const dispatch = await response.json();
      return { ...dispatch, sourceFile: url };
    } catch (error) {
      failures.push(`${url} -> ${error.message}`);
    }
  }

  throw new Error(`Failed to load ${fileName}. Tried: ${failures.join(" | ")}`);
}

function getDispatchCandidateUrls(fileName) {
  const pageUrl = new URL(window.location.href);
  pageUrl.hash = "";

  const path = pageUrl.pathname.replace(/\/+$/, "");
  const htmlRoot = path.endsWith("/FrontEnd/HTML")
    ? `${pageUrl.origin}${path}/`
    : `${pageUrl.origin}/FrontEnd/HTML/`;

  return [
    new URL(`./data/${fileName}`, pageUrl).toString(),
    new URL(`data/${fileName}`, `${htmlRoot}`).toString(),
    new URL(fileName, `${htmlRoot}data/`).toString(),
  ].filter((value, index, list) => list.indexOf(value) === index);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
