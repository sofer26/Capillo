
const client = window.supabaseClient;

const loginSection = document.getElementById("login");
const panelSection = document.getElementById("panel");
const message = document.getElementById("message");

let currentNumbers = [];

// Selección temporal: no se guarda en Supabase
const selectedNumbers = new Set();
const DEMO_PRICE = 10;

function showMessage(text, color = "#00e5ff") {
  message.textContent = text;
  message.style.color = color;
}

function showLogin() {
  loginSection.classList.remove("hidden");
  panelSection.classList.add("hidden");
}

function showPanel(email) {
  loginSection.classList.add("hidden");
  panelSection.classList.remove("hidden");
  document.getElementById("adminEmail").textContent =
    "Sesión: " + email;
}

async function verifyAdmin(user) {
  const { data, error } = await client.rpc("is_admin");

  if (error || data !== true) {
    await client.auth.signOut();
    showLogin();
    showMessage("Acceso denegado: administrador no autorizado.", "#fca5a5");
    return;
  }

showPanel(user.email);

await loadNumbers();
await loadPendingPayments();
}

async function loadNumbers() {
  const button = document.getElementById("refreshButton");
  button.disabled = true;

  showMessage("Consultando base de datos...");

  try {
    const { data: raffle, error: raffleError } = await client
      .from("raffles")
      .select("id, name, status, total_numbers")
      .eq("name", "NEON DRAW - PRUEBA")
      .maybeSingle();

if (raffleError) throw raffleError;

if (!raffle) {
  throw new Error("No se encontró el sorteo.");
}

if (raffle.status !== "active") {
  throw new Error("El sorteo no está activo.");
}

    const { data: numbers, error: numbersError } = await client
      .from("raffle_numbers")
      .select("number, status")
      .eq("raffle_id", raffle.id)
      .order("number", { ascending: true });

    if (numbersError) throw numbersError;

  currentNumbers = numbers || [];

const availableNumbers = new Set(
    currentNumbers
        .filter(item => item.status === "available")
        .map(item => item.number)
);

for (const number of selectedNumbers) {
    if (!availableNumbers.has(number)) {
        selectedNumbers.delete(number);
    }
}

renderNumbers();
    showMessage(
      "Datos actualizados desde Supabase correctamente.",
      "#34d399"
    );

  } catch (error) {
    console.error("Error consultando números:", error);
    showMessage("Error: " + error.message, "#fca5a5");

  } finally {
    button.disabled = false;
  }
}

function renderNumbers() {
    const counts = {
        available: 0,
        reserved: 0,
        paid: 0
    };

    currentNumbers.forEach(item => {
        if (Object.prototype.hasOwnProperty.call(counts, item.status)) {
            counts[item.status]++;
        }
    });

    document.getElementById("total").textContent = currentNumbers.length;
    document.getElementById("available").textContent = counts.available;
    document.getElementById("reserved").textContent = counts.reserved;
    document.getElementById("paid").textContent = counts.paid;

    const filter = document.getElementById("filter").value;
    const grid = document.getElementById("numbersGrid");

    grid.replaceChildren();

    const filtered = currentNumbers.filter(item =>
        filter === "all" || item.status === filter
    );

    filtered.forEach(item => {
        const element = document.createElement("button");
        const isSelected = selectedNumbers.has(item.number);

        element.type = "button";
        element.className = "number " + item.status + (isSelected ? " selected" : "");
        element.textContent = String(item.number).padStart(2, "0");
        element.dataset.number = item.number;
        element.disabled = item.status !== "available";

        element.title = "Número " + item.number +
            " - " + (isSelected ? "Seleccionado" : item.status);

        grid.appendChild(element);
    });

    if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No hay números en esta categoría.";
        grid.appendChild(empty);
    }

    updateSelectionSummary();
}

function updateSelectionSummary() {
    const selected = [...selectedNumbers].sort((a, b) => a - b);

    document.getElementById("selectedCount").textContent = selected.length;

    document.getElementById("selectedTotal").textContent =
        "S/ " + (selected.length * DEMO_PRICE).toFixed(2);

    document.getElementById("selectedList").textContent =
        selected.length
            ? "Números: " + selected.map(n => String(n).padStart(2, "0")).join(", ")
            : "Todavía no has seleccionado números.";
}

document.getElementById("filter").addEventListener(
  "change",
  renderNumbers
);
document.getElementById("numbersGrid").addEventListener("click", event => {
    const button = event.target.closest("button[data-number]");

    if (!button || button.disabled) return;

    const number = Number(button.dataset.number);

    const record = currentNumbers.find(item => item.number === number);

    if (!record || record.status !== "available") return;

    if (selectedNumbers.has(number)) {
        selectedNumbers.delete(number);
    } else {
        selectedNumbers.add(number);
    }

    renderNumbers();
});

document.getElementById("clearSelectionButton").addEventListener("click", () => {
    selectedNumbers.clear();
    renderNumbers();
});

document.getElementById("refreshButton").addEventListener(
  "click",
  loadNumbers
);

document.getElementById("loginForm").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const button = document.getElementById("loginButton");
    button.disabled = true;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage(
        "No se pudo iniciar sesión. Revisa tus credenciales.",
        "#fca5a5"
      );
      button.disabled = false;
      return;
    }

    await verifyAdmin(data.user);
    button.disabled = false;
  }
);

document.getElementById("logoutButton").addEventListener(
  "click",
  async () => {
    const { error } = await client.auth.signOut();

    if (error) {
      showMessage("No se pudo cerrar la sesión.", "#fca5a5");
      return;
    }

    currentNumbers = [];
    showLogin();
    document.getElementById("loginForm").reset();
  }
);

async function initializeAdmin() {
  showLogin();

  if (!client) {
    showMessage("No se pudo conectar con Supabase.", "#fca5a5");
    return;
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    showMessage("No se pudo consultar la sesión.", "#fca5a5");
    return;
  }

  if (data.session) {
    await verifyAdmin(data.session.user);
  }
}

initializeAdmin();

async function loadParticipants() {
    const container = document.getElementById("participantsContainer");
    const button = document.getElementById("refreshParticipantsButton");

    if (!container) return;

    button.disabled = true;
    container.innerHTML = '<p class="muted">Cargando participantes...</p>';

    try {
        const { data, error } = await client
            .from("participants")
            .select(`
                id,
                full_name,
                whatsapp,
                created_at,
                reservations (
                    id,
                    status,
                    created_at,
                    reservation_numbers (
                        raffle_number_id,
                        raffle_numbers (
                            number
                        )
                    )
                )
            `)
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="muted">Todavía no hay participantes DEMO.</p>';
            return;
        }
const totalParticipantsElement =
    document.getElementById("totalParticipants");

const totalSimulatedElement =
    document.getElementById("totalSimulated");

let totalSimulated = 0;

data.forEach(participant => {
    const reservations = participant.reservations || [];

    reservations.forEach(reservation => {
        if (reservation.status === "pending") {
            const reservationNumbers =
                reservation.reservation_numbers || [];

            totalSimulated += reservationNumbers.length * 10;
        }
    });
});

if (totalParticipantsElement) {
    totalParticipantsElement.textContent = data.length;
  console.log("PARTICIPANTES:", data.length);
}

if (totalSimulatedElement) {
    totalSimulatedElement.textContent =
        `S/ ${totalSimulated.toFixed(2)}`;
  console.log("TOTAL SIMULADO:", totalSimulated);
}
        container.innerHTML = "";

        data.forEach(participant => {
            const card = document.createElement("div");

            card.style.border = "1px solid rgba(255,255,255,0.1)";
            card.style.borderRadius = "12px";
            card.style.padding = "16px";
            card.style.marginBottom = "12px";
            card.style.background = "rgba(255,255,255,0.03)";

            const reservations = participant.reservations || [];

            const numbers = [];

            reservations.forEach(reservation => {
                const reservationNumbers =
                    reservation.reservation_numbers || [];

                reservationNumbers.forEach(item => {
                    if (item.raffle_numbers) {
                        numbers.push(item.raffle_numbers.number);
                    }
                });
            });

            numbers.sort((a, b) => a - b);

            const formattedNumbers = numbers.length
                ? numbers.map(n => String(n).padStart(2, "0")).join(", ")
                : "Sin números";
              const total = numbers.length * 10;

              const formattedTotal = `S/ ${total.toFixed(2)}`;
            const status =
                reservations.length > 0
                    ? reservations[0].status
                    : "sin reserva";

       card.innerHTML = `
    <strong>${participant.full_name}</strong>

    <div style="margin-top:6px">
        WhatsApp: ${participant.whatsapp}
    </div>

    <div style="margin-top:6px">
        Números: <strong>${formattedNumbers}</strong>
    </div>

    <div style="margin-top:6px">
        Total simulado: <strong>${formattedTotal}</strong>
    </div>

    <div style="margin-top:6px">
        Estado: <strong>${status}</strong>
    </div>
`;

const pendingReservation = reservations.find(
    reservation => reservation.status === "pending"
);

if (pendingReservation) {
    const releaseButton = document.createElement("button");

    releaseButton.type = "button";
    releaseButton.textContent = "Liberar reserva";
    releaseButton.style.marginTop = "12px";

    releaseButton.addEventListener("click", async () => {

        const confirmed = confirm(
            `¿Liberar los números ${formattedNumbers}?`
        );

        if (!confirmed) return;

        releaseButton.disabled = true;
        releaseButton.textContent = "Liberando...";

        try {

            const { data, error } = await client.rpc(
                "demo_cancel_reservation",
                {
                    p_reservation_id: pendingReservation.id
                }
            );

            if (error) throw error;

            console.log("Reserva liberada:", data);

            alert(
                `Reserva liberada correctamente.\n\n` +
                `Números disponibles nuevamente: ${formattedNumbers}`
            );

            await loadParticipants();

            await loadNumbers();

        } catch (error) {

            console.error(
                "Error liberando reserva:",
                error
            );

            alert(
                "No se pudo liberar la reserva.\n\n" +
                error.message
            );

            releaseButton.disabled = false;
            releaseButton.textContent = "Liberar reserva";
        }
    });

    card.appendChild(releaseButton);
}

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error cargando participantes:", error);

        container.innerHTML =
            '<p class="muted">No se pudieron cargar los participantes.</p>';
    } finally {
        button.disabled = false;
    }
}


document
    .getElementById("refreshParticipantsButton")
    .addEventListener("click", loadParticipants);

/* =========================================================
   PAGOS PENDIENTES
========================================================= */

function ensurePendingPaymentsSection() {

    if (document.getElementById("pendingPaymentsSection")) {
        return;
    }

    const section = document.createElement("section");

    section.id = "pendingPaymentsSection";

    section.style.marginTop = "30px";
    section.style.padding = "20px";
    section.style.border = "1px solid rgba(0,229,255,.25)";
    section.style.borderRadius = "16px";
    section.style.background = "rgba(0,0,0,.18)";

    section.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
            flex-wrap:wrap;
        ">
            <div>
                <h2 style="margin:0;color:#00e5ff;">
                    💳 Pagos pendientes
                </h2>

                <p style="
                    margin-top:6px;
                    color:#94a3b8;
                ">
                    Revisa los pagos reportados por los participantes.
                </p>
            </div>

            <button
                id="refreshPaymentsButton"
                type="button"
                style="
                    padding:10px 14px;
                    border:none;
                    border-radius:8px;
                    cursor:pointer;
                    font-weight:700;
                "
            >
                🔄 Actualizar pagos
            </button>
        </div>

        <div
            id="pendingPaymentsContainer"
            style="margin-top:18px;"
        >
            <p style="color:#94a3b8;">
                Cargando pagos pendientes...
            </p>
        </div>
    `;

    panelSection.appendChild(section);

    document
        .getElementById("refreshPaymentsButton")
        .addEventListener(
            "click",
            loadPendingPayments
        );
}


/* =========================================================
   CARGAR PAGOS
========================================================= */

async function loadPendingPayments() {

    ensurePendingPaymentsSection();

    const container =
        document.getElementById(
            "pendingPaymentsContainer"
        );

    const button =
        document.getElementById(
            "refreshPaymentsButton"
        );

    if (button) {
        button.disabled = true;
        button.textContent = "Cargando...";
    }

    container.innerHTML = `
        <p style="color:#94a3b8;">
            Consultando pagos pendientes...
        </p>
    `;

    try {

        const { data, error } = await client
            .from("reservations")
            .select(`
                id,
                ticket_code,
                status,
                payment_status,
                payment_reference,
                payment_submitted_at,
                created_at,
                participant_id,
                participants (
                    full_name,
                    whatsapp
                ),
                reservation_numbers (
                    raffle_number_id,
                    raffle_numbers (
                        number
                    )
                )
            `)
            .eq("payment_status", "submitted")
            .eq("status", "pending")
            .order(
                "payment_submitted_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {

            container.innerHTML = `
                <div style="
                    padding:20px;
                    text-align:center;
                    border-radius:12px;
                    background:rgba(52,211,153,.08);
                    border:1px solid rgba(52,211,153,.2);
                ">
                    <strong style="color:#34d399;">
                        ✅ No hay pagos pendientes
                    </strong>

                    <p style="
                        margin-top:6px;
                        color:#94a3b8;
                    ">
                        Cuando un cliente reporte un pago,
                        aparecerá aquí.
                    </p>
                </div>
            `;

            return;
        }


        container.innerHTML = "";


        data.forEach(reservation => {

            const participant =
                reservation.participants || {};

            const numbers =
                (reservation.reservation_numbers || [])
                    .map(item =>
                        item.raffle_numbers
                            ? item.raffle_numbers.number
                            : null
                    )
                    .filter(number => number !== null)
                    .sort((a, b) => a - b);

            const total =
                numbers.length * DEMO_PRICE;

            const formattedNumbers =
                numbers
                    .map(number =>
                        String(number).padStart(2, "0")
                    )
                    .join(", ");

            const card =
                document.createElement("div");

            card.style.padding = "18px";
            card.style.marginBottom = "14px";
            card.style.borderRadius = "14px";
            card.style.border =
                "1px solid rgba(250,204,21,.25)";
            card.style.background =
                "rgba(250,204,21,.05)";


            card.innerHTML = `

                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:10px;
                    flex-wrap:wrap;
                    align-items:center;
                ">

                    <strong style="
                        font-size:20px;
                        color:#00e5ff;
                    ">
                        🎟️ ${reservation.ticket_code || "Sin código"}
                    </strong>

                    <span style="
                        padding:5px 9px;
                        border-radius:20px;
                        background:rgba(250,204,21,.15);
                        color:#facc15;
                        font-size:12px;
                        font-weight:700;
                    ">
                        🟡 PAGO REPORTADO
                    </span>

                </div>


                <div style="margin-top:14px;line-height:1.8;">

                    <div>
                        👤
                        <strong>
                            ${participant.full_name || "Sin nombre"}
                        </strong>
                    </div>

                    <div>
                        📱
                        ${participant.whatsapp || "Sin WhatsApp"}
                    </div>

                    <div>
                        🎯
                        Números:
                        <strong>
                            ${formattedNumbers || "Sin números"}
                        </strong>
                    </div>

                    <div>
                        💰
                        Total:
                        <strong>
                            S/ ${total.toFixed(2)}
                        </strong>
                    </div>

                    <div>
                        🧾
                        Operación:
                        <strong>
                            ${reservation.payment_reference || "No indicada"}
                        </strong>
                    </div>

                    <div style="
                        color:#94a3b8;
                        font-size:13px;
                    ">
                        🕐 Pago reportado:
                        ${
                            reservation.payment_submitted_at
                                ? new Date(
                                    reservation.payment_submitted_at
                                  ).toLocaleString("es-PE")
                                : "Sin fecha"
                        }
                    </div>

                </div>


                <div style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-top:16px;
                ">

                    <button
                        type="button"
                        class="confirm-payment-button"
                        data-id="${reservation.id}"
                        style="
                            flex:1;
                            min-width:160px;
                            padding:12px;
                            border:none;
                            border-radius:9px;
                            cursor:pointer;
                            background:#34d399;
                            color:#07111b;
                            font-weight:800;
                        "
                    >
                        ✅ CONFIRMAR PAGO
                    </button>


                    <button
                        type="button"
                        class="reject-payment-button"
                        data-id="${reservation.id}"
                        style="
                            flex:1;
                            min-width:160px;
                            padding:12px;
                            border:none;
                            border-radius:9px;
                            cursor:pointer;
                            background:#ef4444;
                            color:white;
                            font-weight:800;
                        "
                    >
                        ❌ RECHAZAR
                    </button>


                    <a
                        href="https://wa.me/51${String(
                            participant.whatsapp || ""
                        ).replace(/\\D/g, "")}"
                        target="_blank"
                        rel="noopener"
                        style="
                            flex:1;
                            min-width:160px;
                            padding:12px;
                            border-radius:9px;
                            text-align:center;
                            text-decoration:none;
                            background:#25d366;
                            color:white;
                            font-weight:800;
                        "
                    >
                        📲 WHATSAPP
                    </a>

                </div>
            `;


            container.appendChild(card);
        });


        document
            .querySelectorAll(".confirm-payment-button")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () =>
                        confirmPayment(
                            button.dataset.id
                        )
                );

            });


        document
            .querySelectorAll(".reject-payment-button")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () =>
                        rejectPayment(
                            button.dataset.id
                        )
                );

            });


    } catch (error) {

        console.error(
            "Error cargando pagos:",
            error
        );

        container.innerHTML = `
            <p style="color:#fca5a5;">
                ❌ No se pudieron cargar los pagos:
                ${error.message}
            </p>
        `;

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = "🔄 Actualizar pagos";
        }

    }
}


/* =========================================================
   CONFIRMAR PAGO
========================================================= */

async function confirmPayment(reservationId) {

    const confirmed =
        confirm(
            "¿Confirmar que el pago fue recibido correctamente?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const { data, error } =
            await client.rpc(
                "confirm_reservation_payment",
                {
                    p_reservation_id:
                        reservationId
                }
            );

        if (error) {
            throw error;
        }

        console.log(
            "Pago confirmado:",
            data
        );

        alert(
            "✅ Pago confirmado correctamente.\n\n" +
            "Los números ahora están marcados como PAGADOS."
        );

        await loadPendingPayments();
        await loadNumbers();
        await loadParticipants();

    } catch (error) {

        console.error(
            "Error confirmando pago:",
            error
        );

        alert(
            "❌ No se pudo confirmar el pago.\n\n" +
            error.message
        );
    }
}


/* =========================================================
   RECHAZAR PAGO
========================================================= */

async function rejectPayment(reservationId) {

    const reason =
        prompt(
            "Motivo del rechazo (opcional):"
        );

    if (reason === null) {
        return;
    }

    const confirmed =
        confirm(
            "¿Rechazar este pago y liberar los números?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const { data, error } =
            await client.rpc(
                "reject_reservation_payment",
                {
                    p_reservation_id:
                        reservationId,

                    p_reason:
                        reason
                }
            );

        if (error) {
            throw error;
        }

        console.log(
            "Pago rechazado:",
            data
        );

        alert(
            "❌ Pago rechazado.\n\n" +
            "Los números fueron liberados nuevamente."
        );

        await loadPendingPayments();
        await loadNumbers();
        await loadParticipants();

    } catch (error) {

        console.error(
            "Error rechazando pago:",
            error
        );

        alert(
            "No se pudo rechazar el pago.\n\n" +
            error.message
        );
    }
}
