
/* ==================================================
   KANZAK — Application Engine
   Main JavaScript | Version 1.0
   ================================================== */

"use strict";

(() => {

  /* 1. DOM Helpers */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  /* 2. Application State */

  const state = {
    currentUser: null,
    isAdmin: false,
    sections: [],
    branches: [],
    materials: [],
    currentView: "home",
    currentBranch: null,
    currentMaterial: null,
    searchQuery: ""
  };

  const views = {
    home: "view-home",
    sections: "view-sections",
    branches: "view-branches",
    materials: "view-materials",
    material: "view-material",
    search: "view-search",
    register: "view-register",
    login: "view-login",
    "verify-phone": "view-verify-phone",
    subscription: "view-subscription",
    contact: "view-contact",
    admin: "view-admin",
    "admin-sections": "view-admin-sections",
    "admin-branches": "view-admin-branches",
    "admin-materials": "view-admin-materials",
    "admin-material-edit": "view-admin-material-edit",
    "admin-users": "view-admin-users",
    "admin-trials": "view-admin-trials",
    "admin-requests": "view-admin-requests",
    "admin-logs": "view-admin-logs"
  };

  /* 3. Elements */

  const menu = $("#app-menu");
  const menuButton = $("#btn-menu");
  const backButton = $("#btn-back");

  /* 4. Notifications */

  let toastTimer;

  function showToast(message) {
    const toast = $("#toast");

    toast.textContent = message;
    toast.hidden = false;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3000);
  }

  function showError(message) {
    $("#state-error-text").textContent = message;
    $("#state-error").hidden = false;
  }

  function hideStates() {
    $("#state-loading").hidden = true;
    $("#state-error").hidden = true;
    $("#state-empty").hidden = true;
  }

  /* 5. Navigation */

  function navigate(route) {
    location.hash = "#/" + route;
  }

  function renderRoute() {

    const route =
      location.hash.replace(/^#\/?/, "") || "home";

    const parts = route.split("/");

    let page = parts[0];
    let id = parts[1] || null;

    if (page === "admin" && id) {
      page = "admin-" + id;
    }

    if (!views[page]) {
      page = "home";
    }

    if (page.startsWith("admin") && !state.isAdmin) {
      page = "login";
      history.replaceState(null, "", "#/login");
    }

    hideStates();

    Object.values(views).forEach(viewId => {
      const element = document.getElementById(viewId);

      if (element) element.hidden = true;
    });

    const target = document.getElementById(views[page]);

    if (target) target.hidden = false;

    state.currentView = page;

    backButton.hidden = page === "home";

    menu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");

    updateMenu();

    if (page === "sections") renderSections();

    if (page === "branches") renderBranches(id);

    if (page === "materials") renderMaterials(id);

    if (page === "material") renderMaterial(id);

    if (page === "subscription") renderSubscription();

    if (page === "admin") renderAdmin();

    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", renderRoute);

  /* 6. Menu */

  menuButton.addEventListener("click", () => {

    menu.hidden = !menu.hidden;

    menuButton.setAttribute(
      "aria-expanded",
      String(!menu.hidden)
    );

  });

  backButton.addEventListener("click", () => {

    if (history.length > 1) {
      history.back();
    } else {
      navigate("home");
    }

  });

  function updateMenu() {

    $$("[data-guest-only]").forEach(element => {
      element.hidden = !!state.currentUser;
    });

    $$("[data-user-only]").forEach(element => {
      element.hidden = !state.currentUser;
    });

    $$("[data-admin-only]").forEach(element => {
      element.hidden = !state.isAdmin;
    });

  }

  /* 7. Safe Card Builder */

  function createCard(title, description, href) {

    const card = document.createElement("a");

    card.className = "card";
    card.href = href;

    const heading = document.createElement("h3");
    heading.textContent = title || "";

    const paragraph = document.createElement("p");
    paragraph.textContent = description || "";

    card.append(heading, paragraph);

    return card;

  }

  /* 8. Sections */

  function renderSections() {

    const containers = [
      $("#home-sections-grid"),
      $("#sections-grid")
    ];

    containers.forEach(container => {

      if (!container) return;

      container.replaceChildren();

      state.sections.forEach(section => {

        container.appendChild(
          createCard(
            section.name,
            section.description,
            "#/branches/" + encodeURIComponent(section.id)
          )
        );

      });

      if (!state.sections.length) {

        const message = document.createElement("p");

        message.textContent =
          "سيتم عرض الأقسام بعد إضافة البيانات.";

        container.appendChild(message);

      }

    });

  }

  /* 9. Branches */

  function renderBranches(sectionId) {

    const container = $("#branches-list");

    container.replaceChildren();

    const section = state.sections.find(
      item => String(item.id) === String(sectionId)
    );

    $("#branches-title").textContent =
      section ? section.name : "الفروع";

    const branches = state.branches.filter(
      item => String(item.section_id) === String(sectionId)
    );

    $("#branches-count").textContent =
      branches.length + " فرع";

    branches.forEach(branch => {

      container.appendChild(
        createCard(
          branch.name,
          branch.description,
          "#/materials/" + encodeURIComponent(branch.id)
        )
      );

    });

  }

  /* 10. Materials */

  function normalize(value) {

    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");

  }

  function renderMaterials(branchId) {

    const container = $("#materials-list");

    container.replaceChildren();

    state.currentBranch = branchId;

    const branch = state.branches.find(
      item => String(item.id) === String(branchId)
    );

    $("#materials-title").textContent =
      branch ? branch.name : "المواد الخام";

    function update() {

      container.replaceChildren();

      let materials = state.materials.filter(
        item => String(item.branch_id) === String(branchId)
      );

      const filter = normalize($("#materials-filter").value);

      if (filter) {

        materials = materials.filter(item =>
          normalize(item.name_ar + " " + item.name_en)
            .includes(filter)
        );

      }

      const sort = $("#materials-sort").value;

      materials.sort((a, b) => {

        const field = sort === "ar" ? "name_ar" : "name_en";

        return String(a[field] || "").localeCompare(
          String(b[field] || ""),
          sort === "ar" ? "ar" : "en"
        );

      });

      $("#materials-count").textContent =
        materials.length + " مادة";

      materials.forEach(material => {

        const card = createCard(
          material.name_ar,
          material.name_en,
          "#/material/" + encodeURIComponent(material.id)
        );

        if ($("#materials-show-ids").checked) {

          const small = document.createElement("small");

          small.textContent = "ID: " + material.id;

          card.appendChild(small);

        }

        container.appendChild(card);

      });

    }

    $("#materials-filter").oninput = update;
    $("#materials-sort").onchange = update;
    $("#materials-show-ids").onchange = update;

    update();

  }

  /* 11. Scientific Material File */

  const materialFields = [
    "chemical_name",
    "aliases",
    "cas",
    "inci",
    "definition",
    "composition",
    "properties",
    "functions",
    "usage_levels",
    "solubility",
    "ph",
    "compatibility",
    "incompatibility",
    "processing",
    "storage",
    "safety",
    "references"
  ];

  function renderMaterial(materialId) {

    const material = state.materials.find(
      item => String(item.id) === String(materialId)
    );

    if (!material) {

      showToast("المادة غير موجودة.");

      return;

    }

    state.currentMaterial = material;

    $("#m-name-ar").textContent = material.name_ar || "";

    $("#m-name-en").textContent = material.name_en || "";

    materialFields.forEach(field => {

      const block = $(
        `[data-field="${field}"]`
      );

      const body = $(".m-body", block);

      const value = material[field];

      block.hidden =
        value === undefined ||
        value === null ||
        value === "";

      body.textContent = Array.isArray(value)
        ? value.join("، ")
        : value || "";

    });

  }

  /* 12. Search */

  function searchMaterials(query) {

    const q = normalize(query);

    if (!q) return [];

    return state.materials.filter(material => {

      const fields = [
        material.name_ar,
        material.name_en,
        material.chemical_name,
        material.cas,
        material.inci,
        ...(material.aliases || [])
      ];

      return fields.some(value =>
        normalize(value).includes(q)
      );

    });

  }

  function renderSearchResults() {

    const list = $("#search-results");

    const summary = $("#search-summary");

    list.replaceChildren();

    const results = searchMaterials(state.searchQuery);

    summary.textContent =
      results.length + " نتيجة بحث";

    results.forEach(material => {

      const li = document.createElement("li");

      const link = document.createElement("a");

      link.href =
        "#/material/" + encodeURIComponent(material.id);

      link.textContent =
        material.name_ar + " — " + material.name_en;

      li.appendChild(link);

      list.appendChild(li);

    });

    if (!results.length) {

      summary.textContent =
        "لا توجد نتائج مطابقة.";

    }

  }

  function runSearch(query) {

    state.searchQuery = query.trim();

    navigate("search");

    $("#search-page-input").value = state.searchQuery;

    renderSearchResults();

  }

  $("#global-search-form").addEventListener("submit", event => {

    event.preventDefault();

    runSearch($("#global-search").value);

  });

  $("#search-page-form").addEventListener("submit", event => {

    event.preventDefault();

    state.searchQuery =
      $("#search-page-input").value.trim();

    renderSearchResults();

  });

  /* 13. Registration */

  function backendRequired(event) {

    event.preventDefault();

    showToast(
      "يلزم ربط خادم آمن لتفعيل هذه الخدمة."
    );

  }

  $("#form-register").addEventListener(
    "submit",
    backendRequired
  );

  $("#form-login").addEventListener(
    "submit",
    backendRequired
  );

  $("#form-verify").addEventListener(
    "submit",
    backendRequired
  );

  $("#btn-resend-code").addEventListener("click", () => {

    showToast("خدمة إرسال رمز التحقق غير مفعّلة.");

  });

  /* 14. Logout */

  $("#btn-logout").addEventListener("click", () => {

    state.currentUser = null;

    state.isAdmin = false;

    updateMenu();

    navigate("home");

    showToast("تم تسجيل الخروج.");

  });

  /* 15. Subscription */

  function renderSubscription() {

    $("#sub-status-title").textContent =
      state.currentUser ? "حالة الحساب" : "زائر";

    $("#sub-status-text").textContent =
      state.currentUser
        ? "تعذر التحقق من حالة الاشتراك دون الخادم."
        : "سجل الدخول أولاً لمعرفة حالة اشتراكك.";

    $("#sub-remaining").textContent = "";

  }

  $("#btn-request-sub").addEventListener("click", () => {

    showToast("خدمة الاشتراكات تحتاج إلى ربط الخادم.");

  });

  $("#btn-renew-sub").addEventListener("click", () => {

    showToast("خدمة التجديد غير مفعّلة.");

  });

  /* 16. Admin Dashboard */

  function renderAdmin() {

    const container = $("#admin-stats");

    container.replaceChildren();

    const stats = [
      ["الأقسام", state.sections.length],
      ["الفروع", state.branches.length],
      ["المواد", state.materials.length]
    ];

    stats.forEach(([name, count]) => {

      const card = document.createElement("div");

      card.className = "info-card";

      const heading = document.createElement("h3");

      heading.textContent = name;

      const number = document.createElement("p");

      number.textContent = count;

      card.append(heading, number);

      container.appendChild(card);

    });

  }

  $("#btn-admin-add-material").addEventListener("click", () => {

    navigate("admin/material-edit");

  });

  /* 17. WhatsApp */

  const WHATSAPP_NUMBER = "";

  $$("[data-whatsapp]").forEach(link => {

    link.addEventListener("click", event => {

      if (!WHATSAPP_NUMBER) {

        event.preventDefault();

        showToast(
          "أضف رقم واتساب الإدارة لتفعيل الرابط."
        );

        return;

      }

      link.href =
        "https://wa.me/" + WHATSAPP_NUMBER;

    });

  });

  /* 18. Retry */

  $("#btn-retry").addEventListener("click", () => {

    hideStates();

    renderRoute();

  });

  /* 19. Initialization */

  function init() {

    renderSections();

    updateMenu();

    renderRoute();

    console.log(
      "KANZAK initialized successfully."
    );

  }

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );

  } else {

    init();

  }

})();
