const client = window.supabaseClient;
const form = document.getElementById("ticketForm");
const message = document.getElementById("message");
const result = document.getElementById("ticketResult");
const button = document.getElementById("searchButton");

function setMessage(text, color = "#00e5ff") {
    message.textContent = text;
    message.style.color = color;
}

function formatNumbers(numbers) {
    return (numbers || []).map(n => String(n).padStart(2, "0")).join(" · ");
}

function getStatusInfo(data) {
    if (data.payment_status === "confirmed" || data.status === "confirmed") {
        return { className: "confirmed", icon: "🟢", text: "Pago confirmado" };
    }
    if (data.payment_status === "rejected" || data.status === "cancelled") {
        return { className: "rejected", icon: "🔴", text: "Pago rechazado / reserva cancelada" };
    }
    return { className: "pending", icon: "🟡", text: "Pago pendiente de verificación" };
}

function renderTicket(data) {
    const status = getStatusInfo(data);
    const confirmedText = data.confirmed_at
        ? new Date(data.confirmed_at).toLocaleString("es-PE")
        : "";

    result.innerHTML = `
        <section class="ticket">
            <div style="text-align:center;font-size:40px;">🎟️</div>
            <div class="ticket-code">
                <small>CÓDIGO DE TICKET</small>
                <strong>${data.ticket_code}</strong>
            </div>
            <div class="row"><span>Participante</span><strong>${data.full_name}</strong></div>
            <div class="row"><span>Sorteo</span><strong>${data.raffle_name}</strong></div>
            <div class="row"><span>Total</span><strong>S/ ${Number(data.total).toFixed(2)}</strong></div>
            <div class="numbers">🎯 ${formatNumbers(data.numbers)}</div>
            <div class="status ${status.className}">${status.icon} ${status.text}</div>
            ${confirmedText ? `<p style="text-align:center;color:#94a3b8;font-size:13px;margin-bottom:0;">Confirmado: ${confirmedText}</p>` : ""}
        </section>`;
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    const ticketCode = document.getElementById("ticketCode").value.trim();
    const whatsapp = document.getElementById("ticketWhatsapp").value.trim();

    if (!ticketCode || !whatsapp) {
        setMessage("Ingresa el código de ticket y tu WhatsApp.", "#fca5a5");
        return;
    }

    button.disabled = true;
    button.textContent = "CONSULTANDO...";
    result.innerHTML = "";
    setMessage("Consultando ticket...");

    try {
        const { data, error } = await client.rpc("get_public_ticket", {
            p_ticket_code: ticketCode,
            p_whatsapp: whatsapp
        });

        if (error) throw error;
        if (!data || !data.success) throw new Error("No se pudo consultar el ticket.");

        renderTicket(data);
        setMessage("Ticket encontrado.", "#34d399");

        const url = new URL(window.location.href);
        url.searchParams.set("code", ticketCode);
        window.history.replaceState({}, "", url.toString());
    } catch (error) {
        console.error("Error consultando ticket:", error);
        setMessage(error.message, "#fca5a5");
    } finally {
        button.disabled = false;
        button.textContent = "🔎 CONSULTAR TICKET";
    }
});

const codeFromUrl = new URLSearchParams(window.location.search).get("code");
if (codeFromUrl) document.getElementById("ticketCode").value = codeFromUrl;
