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

        button.disabled = item.status !== "available";

        button.title =
            "Número " +
            item.number +
            " - " +
            (selected ? "Seleccionado" : item.status);

        grid.appendChild(button);
    });

    updatePublicSummary();
}

async function loadPublicNumbers() {
    try {
        showPublicMessage("Cargando números...");

        const { data: raffle, error: raffleError } = await client
            .from("raffles")
            .select("id, name, status, price_per_number")
            .eq("name", "NEON DRAW - PRUEBA")
            .maybeSingle();

        if (raffleError) throw raffleError;

        if (!raffle) {
            throw new Error("No se encontró el sorteo DEMO.");
        }

       if (raffle.status !== "active") {
    throw new Error("El sorteo no está disponible para pruebas.");
}

        raffleId = raffle.id;
        demoPrice = Number(raffle.price_per_number);

        const { data: numbers, error: numbersError } = await client
            .from("raffle_numbers")
            .select("number, status")
            .eq("raffle_id", raffle.id)
            .order("number", { ascending: true });

        if (numbersError) throw numbersError;

        publicNumbers = numbers || [];

        renderPublicNumbers();

       showPublicMessage(
    "Selecciona tus números para participar en la prueba.",
    "#34d399"
);

    } catch (error) {
        console.error("Error cargando números:", error);

        showPublicMessage(
            "Error: " + error.message,
            "#fca5a5"
        );
    }
}

document
    .getElementById("publicNumbersGrid")
    .addEventListener("click", event => {

        const button =
            event.target.closest("button[data-number]");

        if (!button || button.disabled) return;

        const number = Number(button.dataset.number);

        const record = publicNumbers.find(
            item => item.number === number
        );

        if (!record || record.status !== "available") return;

        if (publicSelectedNumbers.has(number)) {
            publicSelectedNumbers.delete(number);
        } else {
            publicSelectedNumbers.add(number);
        }

        renderPublicNumbers();
    });

document
    .getElementById("publicClearButton")
    .addEventListener("click", () => {

        publicSelectedNumbers.clear();

        document.getElementById("publicFullName").value = "";
        document.getElementById("publicWhatsapp").value = "";

        renderPublicNumbers();

        showPublicMessage(
            "Selección limpiada.",
            "#00e5ff"
        );
    });

document
    .getElementById("publicSubmitButton")
    .addEventListener("click", async () => {

        const fullName =
            document.getElementById("publicFullName").value.trim();

        const whatsapp =
            document.getElementById("publicWhatsapp").value.trim();

        const selectedNumbers =
            [...publicSelectedNumbers].sort((a, b) => a - b);

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
            document.getElementById("publicSubmitButton");

        button.disabled = true;

        showPublicMessage(
            "Registrando participación..."
        );

        try {

            const { data, error } = await client.rpc(
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
                "Resultado DEMO:",
                data
            );

            showPublicMessage(
               "¡Participación registrada correctamente! Números: " +
                selectedNumbers
                    .map(n => String(n).padStart(2, "0"))
                    .join(", ") +
                " · Total de prueba: S/ " +
                Number(data.total).toFixed(2),
                "#34d399"
            );

            publicSelectedNumbers.clear();

            await loadPublicNumbers();

        } catch (error) {

            console.error(
                "Error registrando simulación:",
                error
            );

            showPublicMessage(
                "No se pudo registrar la simulación: " +
                error.message,
                "#fca5a5"
            );

        } finally {

            button.disabled = false;
        }
    });

loadPublicNumbers();
