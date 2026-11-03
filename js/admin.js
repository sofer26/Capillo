
// NEON DRAW - Autenticación de administrador

const client = window.supabaseClient;

const loginSection = document.getElementById("login");
const panelSection = document.getElementById("panel");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");

function showMessage(text, color = "#fca5a5") {
  message.textContent = text;
  message.style.color = color;
}

function showLogin() {
  loginSection.style.display = "block";
  panelSection.style.display = "none";
}

function showPanel(email) {
  loginSection.style.display = "none";
  panelSection.style.display = "block";
  document.getElementById("adminEmail").textContent =
    "Sesión: " + email;
  showMessage("Acceso autorizado.", "#34d399");
}

async function verifyAdmin(user) {
  const { data, error } = await client.rpc("is_admin");

  if (error) {
    await client.auth.signOut();
    showLogin();
    showMessage("No se pudo verificar el permiso de administrador.");
    return;
  }

  if (data !== true) {
    await client.auth.signOut();
    showLogin();
    showMessage("Tu cuenta no tiene permisos de administrador.");
    return;
  }

  showPanel(user.email);
}

// Iniciar sesión
document.getElementById("loginForm").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    loginButton.disabled = true;
    showMessage("Verificando acceso...", "#00e5ff");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage("No se pudo iniciar sesión. Revisa tus credenciales.");
      loginButton.disabled = false;
      return;
    }

    await verifyAdmin(data.user);
    loginButton.disabled = false;
  }
);

// Cerrar sesión
document.getElementById("logoutButton").addEventListener(
  "click",
  async () => {
    const { error } = await client.auth.signOut();

    if (error) {
      showMessage("No se pudo cerrar la sesión.");
      return;
    }

    showLogin();
    document.getElementById("loginForm").reset();
    showMessage("Sesión cerrada correctamente.", "#34d399");
  }
);

// Revisar si ya existe una sesión
async function initializeAdmin() {
  showLogin();

  const { data, error } = await client.auth.getSession();

  if (error) {
    showMessage("No se pudo consultar la sesión.");
    return;
  }

  if (data.session) {
    await verifyAdmin(data.session.user);
  }
}

initializeAdmin();
