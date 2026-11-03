
// NEON DRAW - Conexión con Supabase

const SUPABASE_URL = "https://muyhsookkgwzmhiczeix.supabase.co";

// Reemplaza este texto con tu Publishable key
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Vy-ONRP-QMnH5FslZQK5PQ_tlZhpvRQ";

// Crear conexión
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// Disponible para los demás archivos de la aplicación
window.supabaseClient = supabaseClient;

console.log("NEON DRAW: conexión con Supabase inicializada");
