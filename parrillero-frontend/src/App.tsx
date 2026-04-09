import { useState, useEffect, useCallback } from "react";
import * as api from "./lib/api";

// ============ TYPES ============
interface Registro {
  id: number;
  conductor_nombre: string;
  conductor_apellido: string;
  cedula: string;
  genero: string;
  fecha_nacimiento: string;
  placa: string;
  motivo: string;
  descripcion: string;
  estado: string;
  fecha_registro: string;
  fecha_vencimiento: string | null;
  parrillero_nombre?: string;
  parrillero_apellido?: string;
  cedula_parrillero?: string;
  moto_marca?: string;
  moto_anio?: string;
  moto_color?: string;
}

interface Estadisticas {
  total: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
  vencidos: number;
}

interface ConsultaResult {
  conductor_nombre: string;
  conductor_apellido: string;
  cedula: string;
  placa: string;
  estado: string;
  fecha_registro: string;
  fecha_vencimiento: string | null;
  parrillero_nombre?: string;
  parrillero_apellido?: string;
  cedula_parrillero?: string;
  moto_marca?: string;
  moto_anio?: string;
  moto_color?: string;
  motivo?: string;
}

// ============ CAPTCHA ============
function generateCaptcha() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  return { question: `${a} + ${b} = ?`, answer: a + b };
}

// ============ STATUS BADGE ============
function StatusBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-300",
    VIGENTE: "bg-green-100 text-green-800 border-green-300",
    RECHAZADO: "bg-red-100 text-red-800 border-red-300",
    VENCIDO: "bg-gray-100 text-gray-800 border-gray-300",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colors[estado] || "bg-gray-100 text-gray-800"}`}>
      {estado}
    </span>
  );
}

// ============ HEADER ============
function Header() {
  return (
    <header className="bg-white shadow-md border-b-4 border-green-700">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 flex items-center justify-center">
              <img
                src="/escudo-duitama.png"
                alt="Escudo de Duitama"
                className="h-14 w-auto"
              />
            </div>
          </div>
          <div className="text-center flex-1">
            <h1 className="text-lg md:text-xl font-bold text-black">
              Alcaldia Municipal de Duitama
            </h1>
            <p className="text-xs md:text-sm text-gray-600">
              Registro de Excepciones - Circulacion con Parrillero
            </p>
            <p className="text-xs md:text-sm font-semibold text-black">
              Secretaria De Gobierno
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 flex items-center justify-center">
              <img
                src="/policia-nacional.png"
                alt="Policia Nacional"
                className="h-14 w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// ============ DECRETO TAB ============
function DecretoTab() {
  const [decreto, setDecreto] = useState({ titulo: "", contenido: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.obtenerDecreto().then((d) => { setDecreto(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-500">Cargando decreto...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-black text-center mb-6">{decreto.titulo}</h2>
      <div
        className="prose max-w-none bg-white p-6 rounded-lg shadow-sm border"
        dangerouslySetInnerHTML={{ __html: decreto.contenido }}
      />
    </div>
  );
}

// ============ SOLICITAR TAB ============
function SolicitarTab() {
  const [form, setForm] = useState({
    conductor_nombre: "",
    conductor_apellido: "",
    cedula: "",
    genero: "masculino",
    fecha_nacimiento: "",
    placa: "",
    motivo: "",
    descripcion: "",
    acepta_politica_datos: false,
    parrillero_nombre: "",
    parrillero_apellido: "",
    cedula_parrillero: "",
    moto_marca: "",
    moto_anio: "",
    moto_color: "",
  });
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (parseInt(captchaInput) !== captcha.answer) {
      setError("Respuesta del CAPTCHA incorrecta");
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      return;
    }

    if (!form.acepta_politica_datos) {
      setError("Debe aceptar la politica de tratamiento de datos personales");
      return;
    }

    if (!form.conductor_nombre || !form.conductor_apellido || !form.cedula || !form.placa || !form.motivo || !form.parrillero_nombre || !form.parrillero_apellido || !form.cedula_parrillero) {
      setError("Todos los campos obligatorios deben ser completados");
      return;
    }

    if (!/^\d{6,12}$/.test(form.cedula)) {
      setError("La cedula debe tener entre 6 y 12 digitos numericos");
      return;
    }

    setSubmitting(true);
    try {
      await api.crearRegistro(form);
      setMessage("Solicitud registrada exitosamente. Su solicitud sera revisada por la autoridad competente.");
      setForm({
        conductor_nombre: "", conductor_apellido: "", cedula: "", genero: "masculino",
        fecha_nacimiento: "", placa: "", motivo: "", descripcion: "", acepta_politica_datos: false,
        parrillero_nombre: "", parrillero_apellido: "", cedula_parrillero: "",
        moto_marca: "", moto_anio: "", moto_color: "",
      });
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-black text-center mb-4">
        Solicitud de Excepcion al Decreto de Parrillero
      </h2>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
        <p className="text-yellow-800 text-sm font-medium">
          <strong>Nota:</strong> La restriccion de parrillero aplica unicamente a <strong>hombres mayores de 14 anos</strong>.
          Solo deben registrarse las personas que cumplan con este criterio.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded">
          <p className="text-green-800">{message}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h3 className="text-lg font-semibold text-black pb-2">Datos del Conductor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Conductor *</label>
            <input
              type="text"
              value={form.conductor_nombre}
              onChange={(e) => setForm({ ...form, conductor_nombre: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido del Conductor *</label>
            <input
              type="text"
              value={form.conductor_apellido}
              onChange={(e) => setForm({ ...form, conductor_apellido: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cedula del Conductor *</label>
            <input
              type="text"
              value={form.cedula}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                if (v.length <= 12) setForm({ ...form, cedula: v });
              }}
              placeholder="Solo numeros (6-12 digitos)"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-black pb-2 pt-2">Datos del Parrillero (Acompanante)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Parrillero *</label>
            <input
              type="text"
              value={form.parrillero_nombre}
              onChange={(e) => setForm({ ...form, parrillero_nombre: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido del Parrillero *</label>
            <input
              type="text"
              value={form.parrillero_apellido}
              onChange={(e) => setForm({ ...form, parrillero_apellido: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cedula del Parrillero *</label>
          <input
            type="text"
            value={form.cedula_parrillero}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              if (v.length <= 12) setForm({ ...form, cedula_parrillero: v });
            }}
            placeholder="Solo numeros (6-12 digitos)"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          />
        </div>

        <h3 className="text-lg font-semibold text-black pb-2 pt-2">Datos de la Motocicleta</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
            <input
              type="text"
              value={form.placa}
              onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
              placeholder="Ej: ABC12E"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
            <input
              type="text"
              value={form.moto_marca}
              onChange={(e) => setForm({ ...form, moto_marca: e.target.value })}
              placeholder="Ej: Pulsar, Yamaha"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <input
              type="text"
              value={form.moto_anio}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                if (v.length <= 4) setForm({ ...form, moto_anio: v });
              }}
              placeholder="Ej: 2017"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <input
            type="text"
            value={form.moto_color}
            onChange={(e) => setForm({ ...form, moto_color: e.target.value })}
            placeholder="Ej: Negro, Rojo"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <h3 className="text-lg font-semibold text-black pb-2 pt-2">Motivo de la Excepcion</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
          <select
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="">Seleccione un motivo</option>
            <option value="TRABAJO">Trabajo</option>
            <option value="EDUCATIVO">Educativo</option>
            <option value="FAMILIAR">Familiar</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            rows={3}
            placeholder="Describa brevemente el motivo de su solicitud"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* CAPTCHA */}
        <div className="bg-gray-50 p-4 rounded-md border">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verificacion de seguridad: {captcha.question}
          </label>
          <input
            type="text"
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            placeholder="Escriba el resultado"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          />
        </div>

        {/* Privacy Policy */}
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-center font-bold text-gray-800 mb-3">
            Autorizacion de Tratamiento de Datos Personales
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            En cumplimiento de la Ley 1581 de 2012, "Por la cual se dictan disposiciones generales para la proteccion de datos personales",
            y su Decreto Reglamentario 1377 de 2013, autorizo a la Alcaldia Municipal de Duitama para recolectar, almacenar, usar y circular
            mis datos personales con la finalidad de tramitar la solicitud de excepcion al decreto de restriccion de parrillero.
            Los datos seran tratados de forma confidencial y solo seran utilizados para los fines aqui mencionados.
          </p>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.acepta_politica_datos}
              onChange={(e) => setForm({ ...form, acepta_politica_datos: e.target.checked })}
              className="mt-1"
            />
            <span className="text-sm text-gray-700">
              Acepto la politica de tratamiento de datos personales (Ley 1581 de 2012)
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-700 text-white py-3 rounded-md font-semibold hover:bg-green-800 transition disabled:opacity-50"
        >
          {submitting ? "Enviando..." : "Enviar Solicitud"}
        </button>
      </form>
    </div>
  );
}

// ============ CONSULTA TAB ============
function ConsultaTab() {
  const [searchType, setSearchType] = useState<"placa" | "cedula">("placa");
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState<ConsultaResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setSearched(true);
    if (!searchValue.trim()) {
      setError(searchType === "placa" ? "Ingrese una placa para consultar" : "Ingrese una cedula para consultar");
      return;
    }
    setLoading(true);
    try {
      const data = searchType === "placa"
        ? await api.consultaPublica(searchValue, undefined)
        : await api.consultaPublica(undefined, searchValue);
      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error en la consulta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-black text-center mb-2">
        Consulta Publica de Excepciones
      </h2>
      <p className="text-gray-600 text-center mb-6 text-sm">
        Verifique el estado de una solicitud de excepcion para circular con parrillero.
      </p>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 max-w-lg mx-auto">
        <div className="flex justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setSearchType("placa"); setSearchValue(""); setResults([]); setSearched(false); setError(""); }}
            className={`px-5 py-2 rounded-md font-semibold text-sm transition ${searchType === "placa" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            Buscar por Placa
          </button>
          <button
            type="button"
            onClick={() => { setSearchType("cedula"); setSearchValue(""); setResults([]); setSearched(false); setError(""); }}
            className={`px-5 py-2 rounded-md font-semibold text-sm transition ${searchType === "cedula" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            Buscar por Cedula
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(searchType === "placa" ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))}
            placeholder={searchType === "placa" ? "Ingrese la placa (ej: GUH92E)" : "Ingrese la cedula"}
            className={`flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${searchType === "placa" ? "uppercase" : ""}`}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-800 text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-900 transition disabled:opacity-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Buscar
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded max-w-lg mx-auto">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-center text-gray-600 text-sm mb-4">{results.length} solicitud(es) encontrada(s)</p>
          <div className="space-y-4">
            {results.map((r, i) => (
              <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-5 relative">
                <div className="absolute top-4 right-4">
                  <StatusBadge estado={r.estado} />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-semibold text-gray-800">
                    Excepcion {r.estado === "PENDIENTE" ? "Pendiente" : r.estado === "VIGENTE" ? "Vigente" : r.estado === "RECHAZADO" ? "Rechazada" : "Vencida"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <p><span className="text-gray-600">Conductor:</span> <span className="font-medium">{r.conductor_nombre} {r.conductor_apellido}</span></p>
                  <p><span className="text-gray-600">Placa:</span> <span className="font-bold">{r.placa}</span></p>
                  <p><span className="text-gray-600">Motocicleta:</span> <span className="font-medium">{[r.moto_marca, r.moto_anio, r.moto_color ? `- ${r.moto_color}` : ""].filter(Boolean).join(" ") || "-"}</span></p>
                  <p><span className="text-gray-600">Parrillero:</span> <span className="font-medium">{r.parrillero_nombre} {r.parrillero_apellido}</span></p>
                  <p><span className="text-gray-600">Cedula Parrillero:</span> <span className="font-medium">{r.cedula_parrillero || "-"}</span></p>
                  <p><span className="text-gray-600">Motivo:</span> <span className="font-medium">{r.motivo || "-"}</span></p>
                  <p><span className="text-gray-600">Fecha de registro:</span> <span className="font-medium">{r.fecha_registro || "-"}</span></p>
                  {r.fecha_vencimiento && <p><span className="text-gray-600">Vence:</span> <span className="font-medium">{r.fecha_vencimiento}</span></p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <p className="text-gray-500 text-center text-sm">No se encontraron resultados</p>
      )}
    </div>
  );
}

// ============ ADMIN LOGIN ============
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login(username, password);
      onLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de autenticacion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <h2 className="text-2xl font-bold text-black text-center mb-6">Panel de Administracion</h2>
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 text-white py-2 rounded-md font-semibold hover:bg-green-800 transition disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

// ============ ADMIN PANEL ============
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [adminTab, setAdminTab] = useState("registros");
  const [loading, setLoading] = useState(true);

  // Decreto editor
  const [decretoTitulo, setDecretoTitulo] = useState("");
  const [decretoContenido, setDecretoContenido] = useState("");
  const [decretoMsg, setDecretoMsg] = useState("");


  // Change password
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passError, setPassError] = useState("");

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, regData] = await Promise.all([
        api.obtenerEstadisticas(),
        api.listarRegistros(page, 20, filtroEstado || undefined),
      ]);
      setStats(statsData);
      setRegistros(regData.registros);
      setTotalPages(regData.total_pages);
      setTotal(regData.total);
    } catch {
      api.logout();
      onLogout();
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado, onLogout]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (adminTab === "decreto") {
      api.obtenerDecreto().then((d) => {
        setDecretoTitulo(d.titulo);
        setDecretoContenido(d.contenido);
      });
    }
  }, [adminTab]);

  const handleEstado = async (id: number, estado: string) => {
    try {
      await api.actualizarEstado(id, estado);
      await loadData();
    } catch {
      alert("Error al actualizar estado");
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("Esta seguro de eliminar este registro?")) return;
    try {
      await api.eliminarRegistro(id);
      await loadData();
    } catch {
      alert("Error al eliminar");
    }
  };

  const handleSaveDecreto = async () => {
    try {
      await api.actualizarDecreto(decretoTitulo, decretoContenido);
      setDecretoMsg("Decreto actualizado exitosamente");
      setTimeout(() => setDecretoMsg(""), 3000);
    } catch {
      setDecretoMsg("Error al actualizar decreto");
    }
  };


  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg("");
    setPassError("");
    try {
      await api.changePassword(currentPass, newPass);
      setPassMsg("Contrasena cambiada exitosamente");
      setCurrentPass("");
      setNewPass("");
      setTimeout(() => { setPassMsg(""); }, 2000);
    } catch (err: unknown) {
      setPassError(err instanceof Error ? err.message : "Error");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportMsg("");
    try {
      await api.exportarRegistros(filtroEstado || undefined);
      setExportMsg("Archivo CSV descargado exitosamente");
      setTimeout(() => setExportMsg(""), 3000);
    } catch {
      setExportMsg("Error al exportar datos");
      setTimeout(() => setExportMsg(""), 3000);
    } finally {
      setExporting(false);
    }
  };

  const filteredRegistros = busqueda.trim()
    ? registros.filter((r) => {
        const q = busqueda.toLowerCase();
        return (
          r.conductor_nombre?.toLowerCase().includes(q) ||
          r.conductor_apellido?.toLowerCase().includes(q) ||
          r.cedula?.toLowerCase().includes(q) ||
          r.placa?.toLowerCase().includes(q)
        );
      })
    : registros;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel Administrativo</h2>
          <p className="text-sm text-gray-500">Bienvenido, Administrador Principal</p>
        </div>
        <button
          onClick={() => { api.logout(); onLogout(); }}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
        >
          <span>&#x2192;</span> Salir
        </button>
      </div>

      {/* Admin tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: "registros", label: "Solicitudes", icon: String.fromCodePoint(0x1F4CB) },
          { key: "decreto", label: "Decreto", icon: String.fromCodePoint(0x2699) },
          { key: "password", label: "Contrasena", icon: String.fromCodePoint(0x1F511) },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setAdminTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap rounded-lg border transition ${
              adminTab === t.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
            <div className="text-blue-600 text-xl mb-1">{String.fromCodePoint(0x1F4C4)}</div>
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-600">Total</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-center">
            <div className="text-yellow-600 text-xl mb-1">{String.fromCodePoint(0x23F3)}</div>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
            <p className="text-xs text-yellow-600">Pendientes</p>
          </div>
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
            <div className="text-green-600 text-xl mb-1">{String.fromCodePoint(0x1F465)}</div>
            <p className="text-2xl font-bold text-green-600">{stats.aprobados}</p>
            <p className="text-xs text-green-600">Vigentes</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-center">
            <div className="text-orange-600 text-xl mb-1">{String.fromCodePoint(0x26A0)}</div>
            <p className="text-2xl font-bold text-orange-600">{stats.vencidos}</p>
            <p className="text-xs text-orange-600">Vencidos</p>
          </div>
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
            <div className="text-red-600 text-xl mb-1">{String.fromCodePoint(0x1F4CA)}</div>
            <p className="text-2xl font-bold text-red-600">{stats.rechazados}</p>
            <p className="text-xs text-red-600">Rechazados</p>
          </div>
        </div>
      )}

      {/* Registros Tab */}
      {adminTab === "registros" && (
        <>
          <div className="bg-white rounded-xl border p-4 mb-4 space-y-3">
            <input
              type="text"
              placeholder="Buscar por placa, cedula o nombre"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
              className="w-full px-4 py-3 border rounded-lg text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="VIGENTE">Vigentes</option>
              <option value="RECHAZADO">Rechazados</option>
              <option value="VENCIDO">Vencidos</option>
            </select>
            <button
              onClick={() => loadData()}
              className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-semibold hover:bg-black transition"
            >
              Buscar
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
            <span className="text-sm text-gray-500">
              Mostrando {filteredRegistros.length} de {total} registros
            </span>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? "Exportando..." : "Descargar CSV"}
            </button>
          </div>
          {exportMsg && (
            <div className={`mb-4 p-3 rounded text-sm ${exportMsg.includes("Error") ? "bg-red-50 border-l-4 border-red-400 text-red-800" : "bg-green-50 border-l-4 border-green-400 text-green-800"}`}>
              {exportMsg}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filteredRegistros.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay registros</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-sm border text-sm">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Cedula</th>
                    <th className="px-3 py-2 text-left">Placa</th>
                    <th className="px-3 py-2 text-left">Motivo</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistros.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{r.id}</td>
                      <td className="px-3 py-2">{r.conductor_nombre} {r.conductor_apellido}</td>
                      <td className="px-3 py-2 font-mono">{r.cedula}</td>
                      <td className="px-3 py-2 font-mono">{r.placa}</td>
                      <td className="px-3 py-2">{r.motivo}</td>
                      <td className="px-3 py-2"><StatusBadge estado={r.estado} /></td>
                      <td className="px-3 py-2 text-xs">{r.fecha_registro?.split("T")[0] || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {r.estado === "PENDIENTE" && (
                            <>
                              <button
                                onClick={() => handleEstado(r.id, "VIGENTE")}
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => handleEstado(r.id, "RECHAZADO")}
                                className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEliminar(r.id)}
                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Pagina {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Password Tab */}
      {adminTab === "password" && (
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4 max-w-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Cambiar Contrasena</h3>
          {passMsg && <div className="bg-green-50 p-3 mb-3 rounded-lg text-green-800 text-sm">{passMsg}</div>}
          {passError && <div className="bg-red-50 p-3 mb-3 rounded-lg text-red-800 text-sm">{passError}</div>}
          <form onSubmit={handleChangePass} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Contrasena actual</label>
              <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Nueva contrasena</label>
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <button type="submit" className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-black transition">Guardar</button>
          </form>
        </div>
      )}

      {/* Decreto Tab */}
      {adminTab === "decreto" && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          {decretoMsg && (
            <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded text-green-800 text-sm">{decretoMsg}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titulo del Decreto</label>
            <input
              type="text"
              value={decretoTitulo}
              onChange={(e) => setDecretoTitulo(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenido (HTML)</label>
            <textarea
              value={decretoContenido}
              onChange={(e) => setDecretoContenido(e.target.value)}
              rows={15}
              className="w-full px-3 py-2 border rounded-md font-mono text-sm"
            />
          </div>
          <button
            onClick={handleSaveDecreto}
            className="bg-green-700 text-white px-6 py-2 rounded-md font-semibold hover:bg-green-800 transition"
          >
            Guardar Decreto
          </button>
        </div>
      )}

    </div>
  );
}

// ============ MAIN APP ============
function App() {
  const [tab, setTab] = useState("decreto");
  const [showAdmin, setShowAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(api.isAuthenticated());

  const publicTabs = [
    { key: "decreto", label: "Decreto" },
    { key: "solicitar", label: "Solicitar Excepcion" },
    { key: "consulta", label: "Consulta Publica" },
  ];

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="p-4 md:p-6">
          {isLoggedIn ? (
            <AdminPanel
              onLogout={() => {
                setIsLoggedIn(false);
                setShowAdmin(false);
              }}
            />
          ) : (
            <AdminLogin onLogin={() => setIsLoggedIn(true)} />
          )}
          <div className="text-center mt-8">
            <button
              onClick={() => setShowAdmin(false)}
              className="text-green-700 text-sm underline hover:text-green-800"
            >
              Volver al sitio publico
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Public Tab Navigation */}
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto flex">
          {publicTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm md:text-base font-medium text-center transition ${
                tab === t.key
                  ? "border-b-3 border-green-700 text-green-700 bg-green-50"
                  : "text-gray-600 hover:text-green-700 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="p-4 md:p-6">
        {tab === "decreto" && <DecretoTab />}
        {tab === "solicitar" && <SolicitarTab />}
        {tab === "consulta" && <ConsultaTab />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8 py-4">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 gap-2">
          <p>Alcaldia Municipal de Duitama - Secretaria de Gobierno</p>
          <button
            onClick={() => setShowAdmin(true)}
            className="text-gray-400 hover:text-green-700 transition text-xs"
          >
            Administracion
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
