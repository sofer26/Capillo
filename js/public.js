const client = window.supabaseClient;

let publicNumbers = [];
const publicSelectedNumbers = new Set();
let raffleId = null;
let demoPrice = 10;

function showPublicMessage(text, color = "#00e5ff") {
    const message = document.getElementById("publicMessage");
    if (!message) return;

    message.textContent = text;
    message.style.color = color;
}

function updatePublicSummary() {
    const selected = [...publicSelectedNumbers].sort((a, b) => a - b);

    document.getElementById("publicSelectedCount").textContent =
        selected.length;

    document.getElementById("publicSelectedTotal").textContent =
        "S/ " + (selected.length * demoPrice).toFixed(2);

    document.getElementById("publicSelectedList").textContent =
        selected.length
            ? "Números: " +
              selected.map(n => String(n).padStart(2, "0")).join(", ")
            : "Todavía no has seleccionado números.";
}

function renderPublicNumbers() {
    const grid = document.getElementById("publicNumbersGrid");
    if (!grid) return;

    grid.replaceChildren();

    publicNumbers.forEach(item => {
        const button = document.createElement("button");

        const selected = publicSelectedNumbers.has(item.number);

        button.type = "button";
        button.className =
            "number " +
            item.status +
            (selected ? " selected" : "");

        button.textContent =
            String(item.number).padStart(2, "0");

        button.dataset.number = item.number;

        button.disabled =
            item.status !== "available";

        button.title =
            "Número " +
            item.number +
            " - " +
            (selected ? "Seleccionado" : item.status);

        grid.appendChild(button);
    });

    updatePublicSummary();
}

/* =========================================================
   TICKET DEL CLIENTE
========================================================= */

function showTicket(data, selectedNumbers) {
    let ticketBox = document.getElementById("publicTicketBox");

    if (!ticketBox) {
        ticketBox = document.createElement("div");
        ticketBox.id = "publicTicketBox";

        ticketBox.style.marginTop = "25px";
        ticketBox.style.padding = "25px";
        ticketBox.style.border = "1px solid rgba(0, 229, 255, 0.45)";
        ticketBox.style.borderRadius = "18px";
        ticketBox.style.background =
            "linear-gradient(145deg, rgba(0,229,255,0.08), rgba(0,0,0,0.35))";
        ticketBox.style.boxShadow =
            "0 0 25px rgba(0,229,255,0.12)";

        const form = document.querySelector(".participant-form");

        if (form) {
            form.insertAdjacentElement("afterend", ticketBox);
        } else {
            document.body.appendChild(ticketBox);
        }
    }

    const formattedNumbers = selectedNumbers
        .map(n => String(n).padStart(2, "0"))
        .join(", ");

    ticketBox.innerHTML = `
        <div style="text-align:center;">

            <div style="
                font-size:42px;
                margin-bottom:8px;
            ">
                🎟️
            </div>

            <h2 style="
                margin:0 0 8px 0;
                color:#34d399;
            ">
                ¡Reserva creada!
            </h2>

            <p style="
                margin:0 0 20px 0;
                opacity:.85;
            ">
                Tu participación fue registrada correctamente.
            </p>

            <div style="
                background:rgba(0,0,0,.35);
                border-radius:14px;
                padding:18px;
                margin-bottom:15px;
            ">

                <div style="
                    font-size:13px;
                    opacity:.7;
                    margin-bottom:5px;
                ">
                    CÓDIGO DE TICKET
                </div>

                <div style="
                    font-size:30px;
                    font-weight:800;
                    letter-spacing:3px;
                    color:#00e5ff;
                ">
                    ${data.ticket_code}
                </div>

            </div>

            <div style="
                text-align:left;
                line-height:1.8;
            ">

                <p>
                    <strong>🎯 Números:</strong>
                    ${formattedNumbers}
                </p>

                <p>
                    <strong>💰 Total:</strong>
                    S/ ${Number(data.total).toFixed(2)}
                </p>

                <p>
                    <strong>🟡 Estado:</strong>
                    <span style="color:#facc15;">
                        Pago pendiente
                    </span>
                </p>

            </div>

            <div style="
                margin-top:18px;
                padding:15px;
                border-radius:12px;
                background:rgba(250,204,21,.08);
                border:1px solid rgba(250,204,21,.25);
                text-align:left;
            ">

                <strong>⚠️ Importante</strong>

                <p style="
                    margin:8px 0 0 0;
                    font-size:14px;
                    line-height:1.5;
                ">
                    Guarda tu código
                    <strong>${data.ticket_code}</strong>.
                    Lo necesitarás para identificar tu reserva
                    y confirmar tu pago.
                </p>

            </div>

            <button
                id="ticketNewReservationButton"
                type="button"
                style="
                    margin-top:20px;
                    width:100%;
                    padding:13px;
                    border:none;
                    border-radius:10px;
                    cursor:pointer;
                    font-weight:700;
                "
            >
                Hacer otra reserva
            </button>

        </div>
    `;

    ticketBox.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    document
        .getElementById("ticketNewReservationButton")
        .addEventListener("click", () => {

            ticketBox.remove();

            publicSelectedNumbers.clear();

            document.getElementById("publicFullName").value = "";
            document.getElementById("publicWhatsapp").value = "";

            renderPublicNumbers();

            showPublicMessage(
                "Puedes realizar una nueva reserva.",
                "#00e5ff"
            );
        });
}

/* =========================================================
   CARGAR NÚMEROS
========================================================= */

async function loadPublicNumbers() {
    try {

        showPublicMessage("Cargando números...");

        const { data: raffle, error: raffleError } =
            await client
                .from("raffles")
                .select(
                    "id, name, status, price_per_number"
                )
                .eq(
                    "name",
                    "NEON DRAW - PRUEBA"
                )
                .maybeSingle();

        if (raffleError) throw raffleError;

        if (!raffle) {
            throw new Error(
                "No se encontró el sorteo."
            );
        }

        if (raffle.status !== "active") {
            throw new Error(
                "El sorteo no está disponible."
            );
        }

        raffleId = raffle.id;

        demoPrice =
            Number(raffle.price_per_number);

        const {
            data: numbers,
            error: numbersError
        } = await client
            .from("raffle_numbers")
            .select("number, status")
            .eq("raffle_id", raffle.id)
            .order("number", {
                ascending: true
            });

        if (numbersError) throw numbersError;

        publicNumbers = numbers || [];

        renderPublicNumbers();

        showPublicMessage(
            "Selecciona tus números para participar.",
            "#34d399"
        );

    } catch (error) {

        console.error(
            "Error cargando números:",
            error
        );

        showPublicMessage(
            "Error: " + error.message,
            "#fca5a5"
        );
    }
}

/* =========================================================
   SELECCIÓN DE NÚMEROS
========================================================= */

document
    .getElementById("publicNumbersGrid")
    .addEventListener("click", event => {

        const button =
            event.target.closest(
                "button[data-number]"
            );

        if (!button || button.disabled) return;

        const number =
            Number(button.dataset.number);

        const record =
            publicNumbers.find(
                item => item.number === number
            );

        if (
            !record ||
            record.status !== "available"
        ) {
            return;
        }

        if (
            publicSelectedNumbers.has(number)
        ) {
            publicSelectedNumbers.delete(number);
        } else {
            publicSelectedNumbers.add(number);
        }

        renderPublicNumbers();
    });

/* =========================================================
   LIMPIAR
========================================================= */

document
    .getElementById("publicClearButton")
    .addEventListener("click", () => {

        publicSelectedNumbers.clear();

        document.getElementById(
            "publicFullName"
        ).value = "";

        document.getElementById(
            "publicWhatsapp"
        ).value = "";

        const ticketBox =
            document.getElementById(
                "publicTicketBox"
            );

        if (ticketBox) {
            ticketBox.remove();
        }

        renderPublicNumbers();

        showPublicMessage(
            "Selección limpiada.",
            "#00e5ff"
        );
    });

/* =========================================================
   REGISTRAR RESERVA
========================================================= */

document
    .getElementById("publicSubmitButton")
    .addEventListener(
        "click",
        async () => {

            const fullName =
                document
                    .getElementById(
                        "publicFullName"
                    )
                    .value
                    .trim();

            const whatsapp =
                document
                    .getElementById(
                        "publicWhatsapp"
                    )
                    .value
                    .trim();

            const selectedNumbers =
                [...publicSelectedNumbers]
                    .sort((a, b) => a - b);

            if (!selectedNumbers.length) {

                showPublicMessage(
                    "Selecciona al menos un número.",
                    "#fca5a5"
                );

                return;
            }

            if (!fullName) {

                showPublicMessage(
                    "Ingresa un nombre.",
                    "#fca5a5"
                );

                return;
            }

            if (!whatsapp) {

                showPublicMessage(
                    "Ingresa un WhatsApp.",
                    "#fca5a5"
                );

                return;
            }

            const button =
                document.getElementById(
                    "publicSubmitButton"
                );

            button.disabled = true;

            showPublicMessage(
                "Registrando tu reserva..."
            );

            try {

                const {
                    data,
                    error
                } = await client.rpc(
                    "demo_register_participant",
                    {
                        p_raffle_id: raffleId,
                        p_full_name: fullName,
                        p_whatsapp: whatsapp,
                        p_numbers: selectedNumbers
                    }
                );

                if (error) throw error;

                console.log(
                    "Reserva creada:",
                    data
                );

                showPublicMessage(
                    "¡Reserva creada correctamente!",
                    "#34d399"
                );

                publicSelectedNumbers.clear();

                await loadPublicNumbers();

                showTicket(
                    data,
                    selectedNumbers
                );

            } catch (error) {

                console.error(
                    "Error registrando reserva:",
                    error
                );

                showPublicMessage(
                    "No se pudo registrar la reserva: " +
                    error.message,
                    "#fca5a5"
                );

            } finally {

                button.disabled = false;
            }
        }
    );

/* =========================================================
   INICIO
========================================================= */

loadPublicNumbers();
