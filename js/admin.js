
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
}

async function loadNumbers() {
  const button = document.getElementById("refreshButton");
  button.disabled = true;

  showMessage("Consultando base de datos...");

  try {
    const { data: raffle, error: raffleError } = await client
      .from("raffles")
      .select("id, name, status, total_numbers")
      .eq("name", "NEON DRAW - DEMO")
      .maybeSingle();

    if (raffleError) throw raffleError;
    if (!raffle) throw new Error("No se encontró el sorteo demo.");
    if (raffle.status !== "demo") {
      throw new Error("El sorteo no está en modo demostración.");
    }

    const { data: numbers, error: numbersError } = await client
      .from("raffle_numbers")
      .select("number, status")
      .eq("raffle_id", raffle.id)
      .order("number", { ascending: true });

    if (numbersError) throw numbersError;

    currentNumbers = numbers || [];
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

  document.getElementById("total").textContent =
    currentNumbers.length;

  document.getElementById("available").textContent =
    counts.available;

  document.getElementById("reserved").textContent =
    counts.reserved;

  document.getElementById("paid").textContent =
    counts.paid;

  const filter = document.getElementById("filter").value;
  const grid = document.getElementById("numbersGrid");

  grid.replaceChildren();

  const filtered = currentNumbers.filter(item =>
    filter === "all" || item.status === filter
  );

  filtered.forEach(item => {
    const element = document.createElement("div");

    element.className = "number " + item.status;
    element.textContent = String(item.number).padStart(2, "0");
    element.title = "Número " + item.number + " - " + item.status;

    grid.appendChild(element);
  });

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No hay números en esta categoría.";
    grid.appendChild(empty);
  }
}

document.getElementById("filter").addEventListener(
  "change",
  renderNumbers
);

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
