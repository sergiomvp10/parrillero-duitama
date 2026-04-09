const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Error de autenticacion");
  }
  const data = await res.json();
  localStorage.setItem("token", data.access_token);
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Error al cambiar contrasena");
  }
  return res.json();
}

export function logout() {
  localStorage.removeItem("token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Registros
export async function crearRegistro(data: {
  conductor_nombre: string;
  conductor_apellido: string;
  cedula: string;
  genero: string;
  fecha_nacimiento: string;
  placa: string;
  motivo: string;
  descripcion: string;
  acepta_politica_datos: boolean;
  parrillero_nombre?: string;
  parrillero_apellido?: string;
  cedula_parrillero?: string;
  moto_marca?: string;
  moto_anio?: string;
  moto_color?: string;
}) {
  const res = await fetch(`${API_URL}/api/registros`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.detail || "Error al crear registro");
  }
  return res.json();
}

export async function listarRegistros(page = 1, perPage = 20, estado?: string) {
  let url = `${API_URL}/api/registros?page=${page}&per_page=${perPage}`;
  if (estado) url += `&estado=${estado}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al obtener registros");
  return res.json();
}

export async function actualizarEstado(id: number, estado: string) {
  const res = await fetch(`${API_URL}/api/registros/${id}/estado`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ estado }),
  });
  if (!res.ok) throw new Error("Error al actualizar estado");
  return res.json();
}

export async function eliminarRegistro(id: number) {
  const res = await fetch(`${API_URL}/api/registros/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al eliminar registro");
  return res.json();
}

// Consulta publica
export async function consultaPublica(placa?: string, cedula?: string) {
  const params = new URLSearchParams();
  if (placa) params.set("placa", placa);
  if (cedula) params.set("cedula", cedula);
  const res = await fetch(`${API_URL}/api/consulta?${params.toString()}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("No se encontraron registros");
    throw new Error("Error en la consulta");
  }
  return res.json();
}

// Decreto
export async function obtenerDecreto() {
  const res = await fetch(`${API_URL}/api/decreto`);
  if (!res.ok) throw new Error("Error al obtener decreto");
  return res.json();
}

export async function actualizarDecreto(titulo: string, contenido: string) {
  const res = await fetch(`${API_URL}/api/decreto`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ titulo, contenido }),
  });
  if (!res.ok) throw new Error("Error al actualizar decreto");
  return res.json();
}

// Configuracion
export async function obtenerConfiguracion() {
  const res = await fetch(`${API_URL}/api/configuracion`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al obtener configuracion");
  return res.json();
}

export async function actualizarConfiguracion(diasVigencia: number) {
  const res = await fetch(`${API_URL}/api/configuracion`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ dias_vigencia: diasVigencia }),
  });
  if (!res.ok) throw new Error("Error al actualizar configuracion");
  return res.json();
}

// Estadisticas
export async function obtenerEstadisticas() {
  const res = await fetch(`${API_URL}/api/estadisticas`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al obtener estadisticas");
  return res.json();
}

// Exportar datos
export async function exportarRegistros(estado?: string) {
  let url = `${API_URL}/api/exportar?formato=csv`;
  if (estado) url += `&estado=${estado}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al exportar registros");
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
  a.download = `registros_parrillero_${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}
