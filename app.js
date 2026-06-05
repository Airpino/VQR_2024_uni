const tableSpecs = {
  area_gev: [
    { key: "tb33", label: "Tab. 3.3 a+b" },
    { key: "tb31", label: "Tab. 3.1 a" },
    { key: "tb32", label: "Tab. 3.2 b" }
  ],
  gsd: [
    { key: "tb36", label: "Tab. 3.6 a+b" },
    { key: "tb34", label: "Tab. 3.4 a" },
    { key: "tb35", label: "Tab. 3.5 b" }
  ],
  ssd: [
    { key: "tb39", label: "Tab. 3.9 a+b" },
    { key: "tb37", label: "Tab. 3.7 a" },
    { key: "tb38", label: "Tab. 3.8 b" }
  ],
  dip: [
    { key: "tb43", label: "Tab. 4.3 a+b" },
    { key: "tb41", label: "Tab. 4.1 a" },
    { key: "tb42", label: "Tab. 4.2 b" }
  ],
  dipgsd: [
    { key: "tb46", label: "Tab. 4.6 a+b" },
    { key: "tb44", label: "Tab. 4.4 a" },
    { key: "tb45", label: "Tab. 4.5 b" }
  ]
};

const tableTargets = {
  area_gev: "#table-area-gev",
  gsd: "#table-gsd",
  ssd: "#table-ssd",
  dip: "#table-dip",
  dipgsd: "#table-dipgsd"
};

const currentKey = {
  area_gev: "tb33",
  gsd: "tb36",
  ssd: "tb39",
  dip: "tb43",
  dipgsd: "tb46"
};

let METADATA = null;
let TABLES = null;
let dt = null;

function uniqueValues(arr) {
  return [...new Set(arr)].filter(v => v !== null && v !== undefined && v !== "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fillUniversities() {
  const sel = document.getElementById("uniSelect");
  const universities = METADATA?.universities || [];
  sel.innerHTML = universities
    .map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`)
    .join("");
  if (universities.length > 0) sel.value = universities[0];
}

function renderSubnav(group) {
  const el = document.querySelector(`.subnav[data-group="${group}"]`);
  if (!el) return;

  el.innerHTML = tableSpecs[group]
    .map((s, i) => `
      <li class="nav-item">
        <button class="nav-link ${i === 0 ? "active" : ""}" type="button" data-key="${s.key}">
          ${s.label}
        </button>
      </li>
    `)
    .join("");

  el.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      el.querySelectorAll(".nav-link").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      currentKey[group] = btn.dataset.key;
      renderTable(group);
    });
  });
}

function getRowsForCurrentSelection(group) {
  const key = currentKey[group];
  const uni = document.getElementById("uniSelect").value;
  const rows = TABLES?.[key] || [];
  return rows.filter(r => !uni || r.Istituzione === uni);
}

function buildColumns(rows) {
  const keys = uniqueValues(rows.flatMap(r => Object.keys(r)));
  return keys.map(k => ({
    title: k,
    data: k,
    render: function (data, type) {
      if (data === null || data === undefined) return "";
      if (type === "display" || type === "filter") return escapeHtml(data);
      return data;
    }
  }));
}

function renderTable(group) {
  const tableId = tableTargets[group];
  const rows = getRowsForCurrentSelection(group);
  const columns = buildColumns(rows);

  if (dt) {
    dt.destroy();
    $(tableId).empty();
  }

  dt = new DataTable(tableId, {
    data: rows,
    columns,
    scrollX: true,
    pageLength: 25,
    dom: "Bfrtip",
    buttons: ["copy", "csv", "excel"],
    orderCellsTop: true,
    fixedHeader: true,
    autoWidth: true,
    initComplete: function () {
      this.api().columns.adjust();
    }
  });

  setTimeout(() => {
    if (dt) dt.columns.adjust();
  }, 50);
}

function wireEvents() {
  Object.keys(tableSpecs).forEach(renderSubnav);

  document.getElementById("uniSelect").addEventListener("change", () => {
    Object.keys(tableSpecs).forEach(renderTable);
  });

  document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(btn => {
    btn.addEventListener("shown.bs.tab", () => {
      const activePane = document.querySelector(".tab-pane.active");
      if (!activePane) return;
      const group = activePane.querySelector(".subnav")?.dataset.group;
      if (group) renderTable(group);
    });
  });
}

async function loadData() {
  const [metaRes, tablesRes] = await Promise.all([
    fetch("data/metadata.json"),
    fetch("data/tables.json")
  ]);

  if (!metaRes.ok) throw new Error("Impossibile caricare metadata.json");
  if (!tablesRes.ok) throw new Error("Impossibile caricare tables.json");

  METADATA = await metaRes.json();
  TABLES = await tablesRes.json();
}

async function init() {
  try {
    await loadData();
    fillUniversities();
    wireEvents();
    renderTable("area_gev");
  } catch (err) {
    console.error(err);
    alert("Errore nel caricamento dei dati. Controlla i file JSON e i percorsi.");
  }
}

document.addEventListener("DOMContentLoaded", init);