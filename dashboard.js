
const API_URL = "http://127.0.0.1:3000/api";

/* =====html safety==== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

/* =====formatting==== */

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-GB");
}

function formatMoney(value) {
    return "R" + Number(value || 0).toFixed(2);
}

function cardNumber(id) {
    return "WPL" + String(id).padStart(6, "0");
}

/* =====customer identification==== */


async function loadCustomer() {
    const identity = (
        sessionStorage.getItem("wplCustomerIdentity") || ""
    ).trim().toLowerCase();

    if (!sessionStorage.getItem("wplDemoCustomer") || !identity) {
        location.href = "customer-login.html";
        return null;
    }

    const response = await fetch(`${API_URL}/members`);
    const data = await response.json();

    if (!response.ok || !data.success || !Array.isArray(data.members)) {
        throw new Error("Could not load member information.");
    }

    const normalizedIdentity = identity.replace(/[^a-z0-9]/g, "");
    const cardMatch = normalizedIdentity.match(/^wpl0*(\d+)$/);

    const customer = data.members.find(member => {
        const memberId = Number(member.member_id);
        const email = String(member.email || "").trim().toLowerCase();

        if (cardMatch) {
            return memberId === Number(cardMatch[1]);
        }

        if (/^\d+$/.test(normalizedIdentity)) {
            return memberId === Number(normalizedIdentity);
        }

        return email === identity;
    });

    if (!customer) {
        throw new Error("No matching library member was found.");
    }

    if (String(customer.status || "").trim().toLowerCase() !== "active") {
        throw new Error("Your membership is not active.");
    }

    return customer;
}


/* =====customer details==== */

function displayCustomer(customer) {
    const name = customer.full_name || "Library Member";
    const card = cardNumber(customer.member_id);

    document.getElementById("customerName").textContent = name;
    document.getElementById("welcomeName").textContent = `Hello, ${name}!`;
    document.getElementById("libraryCard").textContent = card;

    document.getElementById("profileName").textContent = name;
    document.getElementById("profileCard").textContent = card;
    document.getElementById("profileEmail").textContent = customer.email || "—";
    document.getElementById("profilePhone").textContent = customer.phone || "—";
    document.getElementById("profileStatus").textContent = customer.status || "—";
    document.getElementById("profileDate").textContent =
        formatDate(customer.membership_date);

    document.getElementById("memberStatus").textContent =
        customer.status === "Active" ? "● Active member" : "● Inactive member";
}

/* =====load account records==== */

async function loadAccount(customer) {
    const responses = await Promise.all([
        fetch(`${API_URL}/borrowings`),
        fetch(`${API_URL}/reservations`),
        fetch(`${API_URL}/fines`)
    ]);

    const [borrowingData, reservationData, fineData] =
        await Promise.all(responses.map(response => response.json()));

    if (!responses[0].ok || !borrowingData.success) {
        throw new Error("Could not load borrowing records.");
    }

    if (!responses[1].ok || !reservationData.success) {
        throw new Error("Could not load reservations.");
    }

    if (!responses[2].ok || !fineData.success) {
        throw new Error("Could not load fines.");
    }

    const borrowings = (borrowingData.borrowings || []).filter(item =>
        Number(item.member_id) === Number(customer.member_id) &&
        item.status !== "Returned"
    );

    const reservations = (reservationData.reservations || []).filter(item =>
        Number(item.member_id) === Number(customer.member_id) &&
        ["Pending", "Ready"].includes(item.status)
    );

    const fines = (fineData.fines || []).filter(item =>
        Number(item.member_id) === Number(customer.member_id) &&
        item.status === "Unpaid"
    );

    displayBorrowings(borrowings);
    displayReservations(reservations);
    displayFines(fines);
}

/* =====borrowed books==== */

function displayBorrowings(borrowings) {
    document.getElementById("borrowedCount").textContent = borrowings.length;
    document.getElementById("borrowedStat").textContent = borrowings.length;

    const body = document.getElementById("borrowedBooksBody");

    if (!borrowings.length) {
        body.innerHTML = `
            <tr><td colspan="4">You have no borrowed books.</td></tr>
        `;
        return;
    }

    body.innerHTML = borrowings.map(item => {
        const overdue = item.status === "Overdue";

        return `
            <tr>
                <td>
                    <div class="book">
                        <span>
                            <b>${escapeHTML(item.book_title)}</b>
                            <small>${escapeHTML(item.book_author || "")}</small>
                        </span>
                    </div>
                </td>

                <td>${formatDate(item.borrow_date)}</td>
                <td><b>${formatDate(item.due_date)}</b></td>

                <td>
                    <em class="${overdue ? "soon" : "ok"}">
                        ${overdue ? "Overdue" : "Borrowed"}
                    </em>
                </td>
            </tr>
        `;
    }).join("");
}

/* =====reservations==== */

function displayReservations(reservations) {
    document.getElementById("reservationCount").textContent = reservations.length;
    document.getElementById("reservationStat").textContent = reservations.length;

    document.getElementById("activeReservationLabel").textContent =
        `${reservations.length} active`;

    const container = document.getElementById("customerReservations");

    if (!reservations.length) {
        container.innerHTML = "<p>You have no active reservations.</p>";
        return;
    }

    container.innerHTML = reservations.map(item => `
        <div class="reserve">
            <span>
                <b>${escapeHTML(item.book_title)}</b>
                <small>${escapeHTML(item.book_author || "")}</small>
                <em class="${item.status === "Ready" ? "ok" : "queue"}">
                    ${escapeHTML(item.status)}
                </em>
            </span>
        </div>
    `).join("");
}

/* =====fines==== */

function displayFines(fines) {
    const total = fines.reduce(
        (sum, fine) => sum + Number(fine.amount || 0),
        0
    );

    document.getElementById("fineCount").textContent = fines.length;
    document.getElementById("fineStat").textContent = formatMoney(total);
    document.getElementById("fineTotal").textContent = formatMoney(total);

    const container = document.getElementById("customerFines");

    if (!fines.length) {
        container.innerHTML = "<p>You have no outstanding fines.</p>";
        return;
    }

    container.innerHTML = fines.map(fine => `
        <div class="fine-line">
            <span>Overdue book fine</span>
            <b>${formatMoney(fine.amount)}</b>
        </div>
    `).join("");
}

/* =====logout==== */

document.getElementById("logout").addEventListener("click", () => {
    sessionStorage.removeItem("wplDemoCustomer");
    sessionStorage.removeItem("wplCustomerIdentity");
    sessionStorage.removeItem("wplPendingBookAction");

    location.href = "customer-login.html";
});

/* =====sidebar navigation==== */

document.querySelectorAll(".sidebar a").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".sidebar a").forEach(item => {
            item.classList.remove("selected");
        });

        link.classList.add("selected");
    });
});

/* =====initialise dashboard==== */

document.getElementById("year").textContent = new Date().getFullYear();

async function initialiseDashboard() {
    try {
        const customer = await loadCustomer();

        if (!customer) return;

        displayCustomer(customer);
        await loadAccount(customer);

    } catch (error) {
        console.error(error);

        document.querySelector(".main").insertAdjacentHTML(
            "afterbegin",
            `<p class="message">${escapeHTML(error.message)}</p>`
        );
    }
}

initialiseDashboard();
