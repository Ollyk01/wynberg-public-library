
document.addEventListener("DOMContentLoaded", async () => {

    const API_URL = "http://127.0.0.1:3000/api";

    let books = [];
    let members = [];
    let borrowings = [];
    let reservations = [];
    let fines = [];

    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const menuToggle = document.getElementById("menuToggle");
    const pageTitle = document.getElementById("pageTitle");

    const sections = document.querySelectorAll(".dashboard-section");
    const navigationLinks = document.querySelectorAll(".nav-link");

    const booksTable = document.querySelector("#booksTable tbody");
    const membersTable = document.querySelector("#membersTable tbody");
    const loansTable = document.querySelector("#loansTable tbody");
    const reservationsTable = document.querySelector("#reservationsTable tbody");
    const finesTable = document.getElementById("finesTableBody");

    /* =====api helper==== */

    async function apiRequest(endpoint, options = {}) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            credentials: "include",
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("The server returned an invalid response.");
        }

        if (!response.ok || data.success === false) {
            throw new Error(data.message || "Something went wrong.");
        }

        return data;
    }

    /* =====helpers==== */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function formatDate(value) {
        if (!value) return "—";

        const dateText = String(value).substring(0, 10);
        const parts = dateText.split("-");

        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        return "—";
    }

    function formatCurrency(amount) {
        return Number(amount || 0).toLocaleString("en-ZA", {
            style: "currency",
            currency: "ZAR"
        });
    }

    function todayString() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function getLoanStatus(loan) {
        if (loan.return_date || loan.status === "Returned") {
            return "Returned";
        }

        const dueDate = String(loan.due_date || "").substring(0, 10);

        return dueDate < todayString() ? "Overdue" : "Borrowed";
    }

    function getStatusClass(status) {
        if (["Returned", "Collected", "Ready", "Active", "Paid"].includes(status)) {
            return "status-active";
        }

        if (["Overdue", "Cancelled", "Inactive"].includes(status)) {
            return "status-overdue";
        }

        return "status-pending";
    }

    function showMessage(title, message) {
        const overlay = document.createElement("div");
        overlay.className = "library-form-overlay";

        overlay.innerHTML = `
            <div class="library-form-modal">
                <h2>${escapeHTML(title)}</h2>
                <p class="form-description">${escapeHTML(message)}</p>
                <div class="form-buttons">
                    <button type="button" class="save-button">OK</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector("button").addEventListener("click", () => {
            overlay.remove();
        });
    }

    /* =====modal styling==== */

    const modalStyle = document.createElement("style");

    modalStyle.textContent = `
        .library-form-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 9999;
        }

        .library-form-modal {
            background: #fff;
            width: 100%;
            max-width: 540px;
            max-height: 90vh;
            overflow-y: auto;
            border-radius: 12px;
            padding: 28px;
            box-shadow: 0 15px 45px rgba(0,0,0,0.2);
        }

        .library-form-modal h2 {
            margin: 0 0 8px;
        }

        .library-form-modal .form-description {
            margin-bottom: 20px;
            color: #777;
        }

        .library-form-modal label {
            display: block;
            font-weight: 600;
            margin: 13px 0 6px;
        }

        .library-form-modal input,
        .library-form-modal select {
            width: 100%;
            padding: 11px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font: inherit;
            box-sizing: border-box;
        }

        .library-form-modal .form-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 22px;
        }

        .library-form-modal button {
            padding: 11px 18px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font: inherit;
        }

        .library-form-modal .save-button {
            background: #252525;
            color: white;
        }

        .library-form-modal .cancel-button {
            background: #eee;
            color: #333;
        }

        .table-action {
            margin: 2px;
            cursor: pointer;
        }

        .table-message {
            text-align: center;
            padding: 22px;
            color: #777;
        }
    `;

    document.head.appendChild(modalStyle);

    function openForm(title, fields, initialValues, onSave) {
        const overlay = document.createElement("div");
        overlay.className = "library-form-overlay";

        const fieldHTML = fields.map(field => {
            const value = initialValues[field.name] ?? "";

            if (field.type === "select") {
                return `
                    <label>${escapeHTML(field.label)}</label>
                    <select name="${escapeHTML(field.name)}" ${field.required ? "required" : ""}>
                        ${field.options.map(option => `
                            <option value="${escapeHTML(option)}"
                                ${String(value) === option ? "selected" : ""}>
                                ${escapeHTML(option)}
                            </option>
                        `).join("")}
                    </select>
                `;
            }

            return `
                <label>${escapeHTML(field.label)}</label>
                <input
                    type="${escapeHTML(field.type || "text")}"
                    name="${escapeHTML(field.name)}"
                    value="${escapeHTML(value)}"
                    ${field.required ? "required" : ""}
                    ${field.min !== undefined ? `min="${field.min}"` : ""}
                >
            `;
        }).join("");

        overlay.innerHTML = `
            <div class="library-form-modal">
                <h2>${escapeHTML(title)}</h2>
                <p class="form-description">Enter the details below.</p>

                <form>
                    ${fieldHTML}

                    <div class="form-buttons">
                        <button type="button" class="cancel-button">Cancel</button>
                        <button type="submit" class="save-button">Save</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector(".cancel-button").addEventListener("click", () => {
            overlay.remove();
        });

        overlay.addEventListener("click", event => {
            if (event.target === overlay) overlay.remove();
        });

        overlay.querySelector("form").addEventListener("submit", async event => {
            event.preventDefault();

            const form = event.currentTarget;
            const saveButton = form.querySelector(".save-button");
            const formData = Object.fromEntries(new FormData(form).entries());

            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            try {
                await onSave(formData);
                overlay.remove();
            } catch (error) {
                saveButton.disabled = false;
                saveButton.textContent = "Save";
                showMessage("Unable to save", error.message);
            }
        });
    }

    /* =====admin session==== */

    async function checkAdminSession() {
        try {
            const data = await apiRequest("/auth/me");
            const admin = data.admin;

            if (!admin) throw new Error("Admin session not found.");

            const nameElement = document.querySelector(".admin-profile-text strong");
            const avatarElement = document.querySelector(".avatar");
            const welcomeElement = document.querySelector(".welcome-row h2");

            if (nameElement) nameElement.textContent = admin.full_name;

            if (avatarElement) {
                avatarElement.textContent = admin.full_name
                    .split(" ")
                    .map(word => word[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();
            }

            if (welcomeElement) {
                welcomeElement.textContent = `Welcome, ${admin.full_name}`;
            }

            return true;

        } catch (error) {
            window.location.replace("admin-login.html");
            return false;
        }
    }

    /* =====date==== */

    const todayDate = document.getElementById("todayDate");

    if (todayDate) {
        todayDate.textContent = new Intl.DateTimeFormat("en-ZA", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date());
    }

    /* =====navigation==== */

    function closeSidebar() {
        sidebar?.classList.remove("open");
        sidebarOverlay?.classList.remove("show");
    }

    function showSection(sectionId) {
        const target = document.getElementById(sectionId);
        if (!target) return;

        sections.forEach(section => section.classList.remove("active-section"));
        navigationLinks.forEach(link => link.classList.remove("active"));

        target.classList.add("active-section");

        const activeLink = document.querySelector(
            `.nav-link[data-section="${sectionId}"]`
        );

        if (activeLink) {
            activeLink.classList.add("active");
            pageTitle.textContent = activeLink.textContent.trim();
        }

        if (sectionId === "overview") pageTitle.textContent = "Overview";

        closeSidebar();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    navigationLinks.forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            showSection(link.dataset.section);
        });
    });

    document.querySelectorAll("[data-section-link]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            showSection(link.dataset.sectionLink);
        });
    });

    document.querySelectorAll("[data-open-section]").forEach(button => {
        button.addEventListener("click", () => {
            showSection(button.dataset.openSection);
        });
    });

    menuToggle?.addEventListener("click", () => {
        sidebar?.classList.toggle("open");
        sidebarOverlay?.classList.toggle("show", sidebar?.classList.contains("open"));
    });

    sidebarOverlay?.addEventListener("click", closeSidebar);

    /* =====logout==== */

    document.querySelector(".logout-link")?.addEventListener("click", async event => {
        event.preventDefault();

        try {
            await apiRequest("/auth/logout", { method: "POST" });
        } catch (error) {
            console.error("Logout error:", error.message);
        }

        window.location.replace("admin-login.html");
    });

    /* =====book management==== */

    async function loadBooks() {
        try {
            const data = await apiRequest("/books");
            books = data.books || [];
            renderBooks();
            updateDashboardStats();
        } catch (error) {
            if (booksTable) {
                booksTable.innerHTML = `
                    <tr><td colspan="8" class="table-message">${escapeHTML(error.message)}</td></tr>
                `;
            }
        }
    }

    function renderBooks() {
        if (!booksTable) return;

        const search = (document.getElementById("bookSearch")?.value || "").toLowerCase();
        const categoryFilter = document.getElementById("bookCategory")?.value || "";

        const filtered = books.filter(book => {
            const matchesSearch =
                `${book.title} ${book.author} ${book.isbn || ""}`.toLowerCase().includes(search);

            return matchesSearch && (!categoryFilter || book.category === categoryFilter);
        });

        if (!filtered.length) {
            booksTable.innerHTML = `<tr><td colspan="8" class="table-message">No matching books found.</td></tr>`;
            return;
        }

        booksTable.innerHTML = filtered.map(book => {
            const available = Number(book.available_copies);
            const status = available > 0 ? "Available" : "Out of stock";

            return `
                <tr>
                    <td>BK${String(book.book_id).padStart(3, "0")}</td>
                    <td>${escapeHTML(book.title)}</td>
                    <td>${escapeHTML(book.author)}</td>
                    <td>${escapeHTML(book.category || "Uncategorised")}</td>
                    <td>${Number(book.total_copies)}</td>
                    <td>${available}</td>
                    <td><span class="status ${available > 0 ? "status-active" : "status-overdue"}">${status}</span></td>
                    <td>
                        <button class="table-action edit-book" data-id="${book.book_id}">Edit</button>
                        <button class="table-action delete-book" data-id="${book.book_id}">Delete</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function bookFields() {
        return [
            { name: "title", label: "Book Title", required: true },
            { name: "author", label: "Author", required: true },
            { name: "isbn", label: "ISBN" },
            { name: "category", label: "Category" },
            { name: "publisher", label: "Publisher" },
            { name: "publication_year", label: "Publication Year", type: "number", min: 0 },
            { name: "total_copies", label: "Total Copies", type: "number", min: 1, required: true }
        ];
    }

    document.getElementById("addBookButton")?.addEventListener("click", () => {
        openForm("Add New Book", bookFields(), { total_copies: 1 }, async formData => {
            formData.publication_year = formData.publication_year || null;
            formData.isbn = formData.isbn || null;
            formData.total_copies = Number(formData.total_copies);

            await apiRequest("/books", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            await loadBooks();
            showMessage("Success", "The book has been added successfully.");
        });
    });

    booksTable?.addEventListener("click", async event => {
        const editButton = event.target.closest(".edit-book");
        const deleteButton = event.target.closest(".delete-book");

        if (editButton) {
            const book = books.find(item => item.book_id == editButton.dataset.id);
            if (!book) return;

            openForm("Edit Book", bookFields(), book, async formData => {
                formData.publication_year = formData.publication_year || null;
                formData.isbn = formData.isbn || null;
                formData.total_copies = Number(formData.total_copies);

                await apiRequest(`/books/${book.book_id}`, {
                    method: "PUT",
                    body: JSON.stringify(formData)
                });

                await loadBooks();
                showMessage("Success", "Book details updated.");
            });
        }

        if (deleteButton) {
            const id = deleteButton.dataset.id;

            if (!confirm("Are you sure you want to delete this book?")) return;

            try {
                await apiRequest(`/books/${id}`, { method: "DELETE" });
                await loadBooks();
                showMessage("Success", "Book deleted successfully.");
            } catch (error) {
                showMessage("Unable to delete book", error.message);
            }
        }
    });

    /* =====member management==== */

    async function loadMembers() {
        try {
            const data = await apiRequest("/members");
            members = data.members || [];
            renderMembers();
            updateDashboardStats();
        } catch (error) {
            if (membersTable) {
                membersTable.innerHTML = `
                    <tr><td colspan="7" class="table-message">${escapeHTML(error.message)}</td></tr>
                `;
            }
        }
    }

    function renderMembers() {
        if (!membersTable) return;

        if (!members.length) {
            membersTable.innerHTML = `<tr><td colspan="7" class="table-message">No members registered.</td></tr>`;
            return;
        }

        const search = (document.getElementById("memberSearch")?.value || "").toLowerCase();
        const statusFilter = document.getElementById("memberStatusFilter")?.value || "";

        const filtered = members.filter(member => {
            const matchesSearch =
                `${member.member_id} ${member.full_name} ${member.email}`.toLowerCase().includes(search);

            const matchesStatus = !statusFilter || member.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        if (!filtered.length) {
            membersTable.innerHTML = `<tr><td colspan="7" class="table-message">No matching members found.</td></tr>`;
            return;
        }

        membersTable.innerHTML = filtered.map(member => `
            <tr>
                <td>WPL${String(member.member_id).padStart(6, "0")}</td>
                <td>${escapeHTML(member.full_name)}</td>
                <td>${escapeHTML(member.email)}</td>
                <td>${escapeHTML(member.phone || "—")}</td>
                <td>${formatDate(member.membership_date)}</td>
                <td><span class="status ${getStatusClass(member.status || "Active")}">${escapeHTML(member.status || "Active")}</span></td>
                <td>
                    <button class="table-action edit-member" data-id="${member.member_id}">Edit</button>
                    <button class="table-action delete-member" data-id="${member.member_id}">Delete</button>
                </td>
            </tr>
        `).join("");
    }

    function memberFields() {
        return [
            { name: "full_name", label: "Full Name", required: true },
            { name: "email", label: "Email Address", type: "email", required: true },
            { name: "phone", label: "Phone Number" },
            { name: "address", label: "Address" }
        ];
    }

    document.getElementById("addMemberButton")?.addEventListener("click", () => {
        openForm("Register New Member", memberFields(), {}, async formData => {
            await apiRequest("/members", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            await loadMembers();
            showMessage("Success", "The member has been registered.");
        });
    });

    membersTable?.addEventListener("click", async event => {
        const editButton = event.target.closest(".edit-member");
        const deleteButton = event.target.closest(".delete-member");

        if (editButton) {
            const member = members.find(item => item.member_id == editButton.dataset.id);
            if (!member) return;

            openForm("Edit Member", [
                ...memberFields(),
                {
                    name: "status",
                    label: "Membership Status",
                    type: "select",
                    options: ["Active", "Inactive"]
                }
            ], member, async formData => {
                await apiRequest(`/members/${member.member_id}`, {
                    method: "PUT",
                    body: JSON.stringify(formData)
                });

                await loadMembers();
                showMessage("Success", "Member details updated.");
            });
        }

        if (deleteButton) {
            const id = deleteButton.dataset.id;

            if (!confirm("Are you sure you want to delete this member?")) return;

            try {
                await apiRequest(`/members/${id}`, { method: "DELETE" });
                await loadMembers();
                showMessage("Success", "Member deleted successfully.");
            } catch (error) {
                showMessage("Unable to delete member", error.message);
            }
        }
    });

    /* =====borrowing management==== */

    async function loadBorrowings() {
        try {
            const data = await apiRequest("/borrowings");
            borrowings = data.borrowings || [];

            renderBorrowings();
            renderRecentBorrowings();
            updateLoanStatistics();
            renderRecentActivity();

        } catch (error) {
            console.error("Borrowings error:", error.message);

            if (loansTable) {
                loansTable.innerHTML = `
                    <tr><td colspan="7" class="table-message">${escapeHTML(error.message)}</td></tr>
                `;
            }

            const recentTable = document.querySelector("#recentBorrowingsTable tbody");

            if (recentTable) {
                recentTable.innerHTML = `
                    <tr><td colspan="5" class="table-message">${escapeHTML(error.message)}</td></tr>
                `;
            }
        }
    }

    function renderBorrowings() {
        if (!loansTable) return;

        const search = (document.getElementById("loanSearch")?.value || "").toLowerCase().trim();
        const selectedStatus = document.getElementById("loanStatusFilter")?.value || "";

        const filtered = borrowings.filter(loan => {
            const status = getLoanStatus(loan);

            const matchesSearch =
                `${loan.borrowing_id} ${loan.member_name} ${loan.book_title}`.toLowerCase().includes(search);

            return matchesSearch && (!selectedStatus || status === selectedStatus);
        });

        if (!filtered.length) {
            loansTable.innerHTML = `<tr><td colspan="7" class="table-message">No borrowing records found.</td></tr>`;
            return;
        }

        loansTable.innerHTML = filtered.map(loan => {
            const status = getLoanStatus(loan);

            return `
                <tr>
                    <td>LN${loan.borrowing_id}</td>
                    <td>${escapeHTML(loan.member_name)}</td>
                    <td>${escapeHTML(loan.book_title)}</td>
                    <td>${formatDate(loan.borrow_date)}</td>
                    <td>${formatDate(loan.due_date)}</td>
                    <td><span class="status ${getStatusClass(status)}">${status}</span></td>
                    <td>
                        ${status !== "Returned"
                            ? `<button class="table-action return-button" data-id="${loan.borrowing_id}">Record return</button>`
                            : "—"}
                    </td>
                </tr>
            `;
        }).join("");
    }

    function renderRecentBorrowings() {
        const table = document.querySelector("#recentBorrowingsTable tbody");
        if (!table) return;

        const latest = [...borrowings]
            .sort((a, b) => String(b.borrow_date).localeCompare(String(a.borrow_date)))
            .slice(0, 5);

        if (!latest.length) {
            table.innerHTML = `<tr><td colspan="5" class="table-message">No borrowing records yet.</td></tr>`;
            return;
        }

        table.innerHTML = latest.map(loan => {
            const status = getLoanStatus(loan);

            return `
                <tr>
                    <td>${escapeHTML(loan.member_name)}</td>
                    <td>${escapeHTML(loan.book_title)}</td>
                    <td>${formatDate(loan.borrow_date)}</td>
                    <td>${formatDate(loan.due_date)}</td>
                    <td><span class="status ${getStatusClass(status)}">${status}</span></td>
                </tr>
            `;
        }).join("");
    }

    function updateLoanStatistics() {
        const active = borrowings.filter(loan => getLoanStatus(loan) !== "Returned");
        const overdue = active.filter(loan => getLoanStatus(loan) === "Overdue");

        const dueToday = active.filter(loan =>
            String(loan.due_date).substring(0, 10) === todayString()
        );

        document.getElementById("booksOnLoanStat").textContent = active.length;
        document.getElementById("overdueBooksStat").textContent = overdue.length;

        document.getElementById("activeLoansStat").textContent = active.length;
        document.getElementById("dueTodayStat").textContent = dueToday.length;
        document.getElementById("loanOverdueStat").textContent = overdue.length;
    }

    loansTable?.addEventListener("click", async event => {
        const button = event.target.closest(".return-button");
        if (!button) return;

        if (!confirm("Are you sure you want to record this book as returned?")) return;

        button.disabled = true;

        try {
            await apiRequest(`/borrowings/${button.dataset.id}/return`, {
                method: "PUT"
            });

            await Promise.all([
                loadBorrowings(),
                loadBooks(),
                loadFines()
            ]);

            showMessage("Book returned", "The book return has been recorded successfully.");

        } catch (error) {
            button.disabled = false;
            showMessage("Return failed", error.message);
        }
    });

    /* =====reservation management==== */

    async function loadReservations() {
        try {
            const data = await apiRequest("/reservations");
            reservations = data.reservations || [];

            renderReservations();
            renderRecentActivity();

        } catch (error) {
            console.error("Reservations error:", error.message);

            if (reservationsTable) {
                reservationsTable.innerHTML = `
                    <tr><td colspan="6" class="table-message">${escapeHTML(error.message)}</td></tr>
                `;
            }
        }
    }

    function renderReservations() {
        if (!reservationsTable) return;

        const search = (document.getElementById("reservationSearch")?.value || "").toLowerCase().trim();
        const selectedStatus = document.getElementById("reservationStatusFilter")?.value || "";

        const filtered = reservations.filter(reservation => {
            const matchesSearch =
                `${reservation.reservation_id} ${reservation.member_name} ${reservation.book_title}`.toLowerCase().includes(search);

            return matchesSearch && (!selectedStatus || reservation.status === selectedStatus);
        });

        if (!filtered.length) {
            reservationsTable.innerHTML = `<tr><td colspan="6" class="table-message">No reservation records found.</td></tr>`;
            return;
        }

        reservationsTable.innerHTML = filtered.map(reservation => {
            let action = "—";

            if (reservation.status === "Pending") {
                action = `
                    <button class="table-action reservation-status-button"
                        data-id="${reservation.reservation_id}" data-status="Ready">
                        Mark ready
                    </button>
                `;
            } else if (reservation.status === "Ready") {
                action = `
                    <button class="table-action reservation-status-button"
                        data-id="${reservation.reservation_id}" data-status="Collected">
                        Mark collected
                    </button>
                `;
            }

            return `
                <tr>
                    <td>RS${reservation.reservation_id}</td>
                    <td>${escapeHTML(reservation.member_name)}</td>
                    <td>${escapeHTML(reservation.book_title)}</td>
                    <td>${formatDate(reservation.reservation_date)}</td>
                    <td><span class="status ${getStatusClass(reservation.status)}">${escapeHTML(reservation.status)}</span></td>
                    <td>${action}</td>
                </tr>
            `;
        }).join("");
    }

    reservationsTable?.addEventListener("click", async event => {
        const button = event.target.closest(".reservation-status-button");
        if (!button) return;

        button.disabled = true;

        try {
            await apiRequest(`/reservations/${button.dataset.id}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: button.dataset.status })
            });

            await loadReservations();

            showMessage("Reservation updated", `The reservation is now ${button.dataset.status}.`);

        } catch (error) {
            button.disabled = false;
            showMessage("Update failed", error.message);
        }
    });

    /* =====fine management==== */

    async function loadFines() {
        try {
            const data = await apiRequest("/fines");
            fines = data.fines || [];

            renderFines();
            updateFineStatistics();

        } catch (error) {
            console.error("Fines error:", error.message);

            if (finesTable) {
                finesTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="table-message">
                            ${escapeHTML(error.message)}
                        </td>
                    </tr>
                `;
            }
        }
    }

    function renderFines() {
        if (!finesTable) return;

        if (!fines.length) {
            finesTable.innerHTML = `
                <tr>
                    <td colspan="7" class="table-message">
                        No fine records found.
                    </td>
                </tr>
            `;
            return;
        }

        finesTable.innerHTML = fines.map(fine => {
            const isPaid = fine.status === "Paid";
            const canPay = !isPaid && Boolean(fine.return_date);

            return `
                <tr>
                    <td>FN${String(fine.fine_id).padStart(3, "0")}</td>
                    <td>${escapeHTML(fine.member_name)}</td>
                    <td>${escapeHTML(fine.book_title)}</td>
                    <td>${Number(fine.overdue_days || 0)}</td>
                    <td>${formatCurrency(5)}</td>
                    <td>${formatCurrency(fine.amount)}</td>
                    <td>
                        <span class="status ${getStatusClass(fine.status)}">
                            ${escapeHTML(fine.status)}
                        </span>

                        ${canPay ? `
                            <button
                                class="table-action pay-fine-button"
                                data-id="${fine.fine_id}">
                                Mark as Paid
                            </button>
                        ` : ""}
                    </td>
                </tr>
            `;
        }).join("");
    }

    function updateFineStatistics() {
        const unpaidFines = fines.filter(fine => fine.status === "Unpaid");
        const paidFines = fines.filter(fine => fine.status === "Paid");

        const outstandingTotal = unpaidFines.reduce(
            (total, fine) => total + Number(fine.amount || 0),
            0
        );

        const collectedTotal = paidFines.reduce(
            (total, fine) => total + Number(fine.amount || 0),
            0
        );

        const membersWithFines = new Set(
            unpaidFines.map(fine => fine.member_id)
        ).size;

        const outstandingElement = document.getElementById("outstandingFineTotal");
        const collectedElement = document.getElementById("collectedFineTotal");
        const membersElement = document.getElementById("membersWithFines");

        if (outstandingElement) {
            outstandingElement.textContent = formatCurrency(outstandingTotal);
        }

        if (collectedElement) {
            collectedElement.textContent = formatCurrency(collectedTotal);
        }

        if (membersElement) {
            membersElement.textContent = membersWithFines;
        }
    }

    finesTable?.addEventListener("click", async event => {
        const button = event.target.closest(".pay-fine-button");
        if (!button) return;

        if (!confirm("Confirm that this fine has been paid?")) return;

        button.disabled = true;
        button.textContent = "Updating...";

        try {
            await apiRequest(`/fines/${button.dataset.id}/pay`, {
                method: "PUT"
            });

            await loadFines();

            showMessage(
                "Payment updated",
                "The fine has been marked as paid successfully."
            );

        } catch (error) {
            button.disabled = false;
            button.textContent = "Mark as Paid";

            showMessage("Payment failed", error.message);
        }
    });

    /* =====recent activity==== */

    function renderRecentActivity() {
        const container = document.getElementById("recentActivityList");
        if (!container) return;

        const activities = [
            ...borrowings.map(loan => ({
                date: loan.borrow_date,
                title: "Book borrowed",
                description: `${loan.member_name} borrowed ${loan.book_title}.`
            })),
            ...reservations.map(reservation => ({
                date: reservation.reservation_date,
                title: "Book reserved",
                description: `${reservation.member_name} reserved ${reservation.book_title}.`
            }))
        ].filter(item => item.date)
         .sort((a, b) => String(b.date).localeCompare(String(a.date)))
         .slice(0, 5);

        if (!activities.length) {
            container.innerHTML = `<p class="table-message">No recent activity.</p>`;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="activity-marker"></span>
                <div>
                    <strong>${escapeHTML(activity.title)}</strong>
                    <p>${escapeHTML(activity.description)}</p>
                    <small>${formatDate(activity.date)}</small>
                </div>
            </div>
        `).join("");
    }

    /* =====search and filters==== */

    document.getElementById("bookSearch")?.addEventListener("input", renderBooks);
    document.getElementById("bookCategory")?.addEventListener("change", renderBooks);

    document.getElementById("memberSearch")?.addEventListener("input", renderMembers);
    document.getElementById("memberStatusFilter")?.addEventListener("change", renderMembers);

    document.getElementById("loanSearch")?.addEventListener("input", renderBorrowings);
    document.getElementById("loanStatusFilter")?.addEventListener("change", renderBorrowings);

    document.getElementById("reservationSearch")?.addEventListener("input", renderReservations);
    document.getElementById("reservationStatusFilter")?.addEventListener("change", renderReservations);

    /* =====dashboard statistics==== */

    function updateDashboardStats() {
        const totalCopies = books.reduce(
            (total, book) => total + Number(book.total_copies || 0),
            0
        );

        const totalBooksElement = document.getElementById("totalBooksStat");
        const membersElement = document.getElementById("registeredMembersStat");

        if (totalBooksElement) {
            totalBooksElement.textContent = totalCopies.toLocaleString("en-ZA");
        }

        if (membersElement) {
            membersElement.textContent = members.length.toLocaleString("en-ZA");
        }
    }

    /* =====reports==== */

    document.querySelectorAll("[data-report]").forEach(button => {
        button.addEventListener("click", () => {
            showMessage(
                button.dataset.report,
                "Report generation is not connected yet."
            );
        });
    });

    /* =====start dashboard==== */

    const authenticated = await checkAdminSession();

    if (!authenticated) return;

    await Promise.all([
        loadBooks(),
        loadMembers(),
        loadBorrowings(),
        loadReservations(),
        loadFines()
    ]);

});
