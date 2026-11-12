/* =========================================
   WYNBERG PUBLIC LIBRARY - ADMIN DASHBOARD
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const menuToggle = document.getElementById("menuToggle");
    const pageTitle = document.getElementById("pageTitle");

    const sections = document.querySelectorAll(".dashboard-section");
    const navigationLinks = document.querySelectorAll(".nav-link");

    const modal = document.getElementById("demoModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalMessage = document.getElementById("modalMessage");
    const modalClose = document.getElementById("modalClose");
    const modalOkay = document.getElementById("modalOkay");

    /* DATE IN HEADER */
    const todayDate = document.getElementById("todayDate");

    if (todayDate) {
        todayDate.textContent = new Intl.DateTimeFormat("en-ZA", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date());
    }

    /* SWITCH DASHBOARD SECTIONS */
    function showSection(sectionId) {
        const targetSection = document.getElementById(sectionId);

        if (!targetSection) {
            return;
        }

        sections.forEach((section) => section.classList.remove("active-section"));
        navigationLinks.forEach((link) => link.classList.remove("active"));

        targetSection.classList.add("active-section");

        const activeLink = document.querySelector(
            `.nav-link[data-section="${sectionId}"]`
        );

        if (activeLink) {
            activeLink.classList.add("active");
            pageTitle.textContent = activeLink.textContent.trim();
        }

        if (sectionId === "overview") {
            pageTitle.textContent = "Overview";
        }

        closeSidebar();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    navigationLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            showSection(link.dataset.section);
        });
    });

    document.querySelectorAll("[data-section-link]").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            showSection(link.dataset.sectionLink);
        });
    });

    document.querySelectorAll("[data-open-section]").forEach((button) => {
        button.addEventListener("click", () => showSection(button.dataset.openSection));
    });

    /* MOBILE SIDEBAR */
    function openSidebar() {
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("show");
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
    }

    menuToggle.addEventListener("click", () => {
        sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
    });

    sidebarOverlay.addEventListener("click", closeSidebar);

    /* DEMONSTRATION MODAL */
    function openModal(title, message) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeModal() {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }

    modalClose.addEventListener("click", closeModal);
    modalOkay.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    /* DEMO ACTION BUTTONS */
    document.getElementById("addBookButton").addEventListener("click", () => {
        openModal("Add New Book", "The book registration form will be connected to the database when the back end is implemented.");
    });

    document.getElementById("addMemberButton").addEventListener("click", () => {
        openModal("Register Member", "The member registration form will be connected to the database in the back-end stage.");
    });

    document.getElementById("issueBookButton").addEventListener("click", () => {
        openModal("Issue a Book", "The borrowing form will allow staff to select a member, select an available book and assign a due date.");
    });

    document.querySelectorAll(".return-button").forEach((button) => {
        button.addEventListener("click", () => {
            openModal("Record Book Return", "The return process will calculate any overdue fine and update the book copy's availability once connected to the database.");
        });
    });

    document.querySelectorAll("[data-report]").forEach((button) => {
        button.addEventListener("click", () => {
            openModal(button.dataset.report, "Report generation is a placeholder in this front-end prototype. It can be implemented using live database records.");
        });
    });

    document.querySelectorAll(".reservation-button").forEach((button) => {
        button.addEventListener("click", () => {
            openModal("Reservation action", "This reservation action is a demonstration. It will update the reservation status when database functionality is added.");
        });
    });

    /* TABLE SEARCH FILTERS */
    function addTableSearch(inputId, tableId) {
        const searchInput = document.getElementById(inputId);
        const table = document.getElementById(tableId);

        if (!searchInput || !table) {
            return;
        }

        searchInput.addEventListener("input", () => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const rows = table.querySelectorAll("tbody tr");

            rows.forEach((row) => {
                const rowText = row.textContent.toLowerCase();
                row.style.display = rowText.includes(searchTerm) ? "" : "none";
            });
        });
    }

    addTableSearch("bookSearch", "booksTable");
    addTableSearch("memberSearch", "membersTable");
    addTableSearch("loanSearch", "loansTable");

    /* BOOK CATEGORY FILTER */
    const bookCategory = document.getElementById("bookCategory");
    const bookSearch = document.getElementById("bookSearch");

    bookCategory.addEventListener("change", filterBooks);
    bookSearch.addEventListener("input", filterBooks);

    function filterBooks() {
        const selectedCategory = bookCategory.value.toLowerCase();
        const searchTerm = bookSearch.value.toLowerCase().trim();
        const bookRows = document.querySelectorAll("#booksTable tbody tr");

        bookRows.forEach((row) => {
            const category = row.cells[3].textContent.toLowerCase();
            const matchesCategory = selectedCategory === "" || category === selectedCategory;
            const matchesSearch = row.textContent.toLowerCase().includes(searchTerm);

            row.style.display = matchesCategory && matchesSearch ? "" : "none";
        });
    }
});
