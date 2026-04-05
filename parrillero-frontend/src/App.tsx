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
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Escudo_de_Duitama.svg/200px-Escudo_de_Duitama.svg.png"
                alt="Escudo de Duitama"
                className="h-14 w-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
          <div className="text-center flex-1">
            <h1 className="text-lg md:text-xl font-bold text-green-800">
              Alcaldia Municipal de Duitama
            </h1>
            <p className="text-xs md:text-sm text-gray-600">
              Secretaria de Gobierno - Control de Movilidad
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 flex items-center justify-center">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Polic%C3%ADa_Nacional_de_Colombia.svg/200px-Polic%C3%ADa_Nacional_de_Colombia.svg.png"
                alt="Policia Nacional"
                className="h-14 w-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
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
      <h2 className="text-2xl font-bold text-green-800 text-center mb-6">{decreto.titulo}</h2>
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

    if (!form.conductor_nombre || !form.conductor_apellido || !form.cedula || !form.placa || !form.motivo) {
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
      <h2 className="text-2xl font-bold text-green-800 text-center mb-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Cedula de Ciudadania *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Genero</label>
            <select
              value={form.genero}
              onChange={(e) => setForm({ ...form, genero: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="masculino">Masculino</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placa de la Moto *</label>
            <input
              type="text"
              value={form.placa}
              onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
              placeholder="Ej: ABC123"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de la Excepcion *</label>
          <select
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="">Seleccione un motivo</option>
            <option value="Trabajo">Trabajo</option>
            <option value="Educativo">Educativo</option>
            <option value="Familiar">Familiar</option>
            <option value="Otro">Otro</option>
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
  const [placa, setPlaca] = useState("");
  const [results, setResults] = useState<ConsultaResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setSearched(true);
    if (!placa.trim()) {
      setError("Ingrese una placa para consultar");
      return;
    }
    setLoading(true);
    try {
      const data = await api.consultaPublica(placa);
      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error en la consulta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-green-800 text-center mb-6">
        Consulta Publica de Excepciones
      </h2>
      <p className="text-gray-600 text-center mb-6 text-sm">
        Consulte el estado de una excepcion ingresando la placa de la motocicleta.
        Los datos personales se muestran parcialmente protegidos.
      </p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6 max-w-md mx-auto">
        <input
          type="text"
          value={placa}
          onChange={(e) => setPlaca(e.target.value.toUpperCase())}
          placeholder="Ingrese la placa (ej: ABC123)"
          className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-700 text-white px-6 py-2 rounded-md font-semibold hover:bg-green-800 transition disabled:opacity-50"
        >
          {loading ? "..." : "Buscar"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded max-w-md mx-auto">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg shadow-sm border text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="px-4 py-3 text-left text-green-800">Nombre</th>
                <th className="px-4 py-3 text-left text-green-800">Apellido</th>
                <th className="px-4 py-3 text-left text-green-800">Cedula</th>
                <th className="px-4 py-3 text-left text-green-800">Placa</th>
                <th className="px-4 py-3 text-left text-green-800">Estado</th>
                <th className="px-4 py-3 text-left text-green-800">Registro</th>
                <th className="px-4 py-3 text-left text-green-800">Vence</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{r.conductor_nombre}</td>
                  <td className="px-4 py-3">{r.conductor_apellido}</td>
                  <td className="px-4 py-3">{r.cedula}</td>
                  <td className="px-4 py-3 font-mono">{r.placa}</td>
                  <td className="px-4 py-3"><StatusBadge estado={r.estado} /></td>
                  <td className="px-4 py-3 text-xs">{r.fecha_registro?.split("T")[0] || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.fecha_vencimiento?.split("T")[0] || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
      <h2 className="text-2xl font-bold text-green-800 text-center mb-6">Panel de Administracion</h2>
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
  const [adminTab, setAdminTab] = useState("registros");
  const [loading, setLoading] = useState(true);

  // Decreto editor
  const [decretoTitulo, setDecretoTitulo] = useState("");
  const [decretoContenido, setDecretoContenido] = useState("");
  const [decretoMsg, setDecretoMsg] = useState("");

  // Config
  const [diasVigencia, setDiasVigencia] = useState(90);
  const [configMsg, setConfigMsg] = useState("");

  // Change password
  const [showChangePass, setShowChangePass] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passError, setPassError] = useState("");

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
    if (adminTab === "configuracion") {
      api.obtenerConfiguracion().then((c) => {
        setDiasVigencia(parseInt(c.dias_vigencia) || 90);
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

  const handleSaveConfig = async () => {
    try {
      await api.actualizarConfiguracion(diasVigencia);
      setConfigMsg("Configuracion actualizada");
      setTimeout(() => setConfigMsg(""), 3000);
    } catch {
      setConfigMsg("Error al actualizar");
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
      setTimeout(() => { setShowChangePass(false); setPassMsg(""); }, 2000);
    } catch (err: unknown) {
      setPassError(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-green-800">Panel de Administracion</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowChangePass(true)}
            className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-300 transition"
          >
            Cambiar Contrasena
          </button>
          <button
            onClick={() => { api.logout(); onLogout(); }}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition"
          >
            Cerrar Sesion
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Cambiar Contrasena</h3>
            {passMsg && <div className="bg-green-50 p-3 mb-3 rounded text-green-800 text-sm">{passMsg}</div>}
            {passError && <div className="bg-red-50 p-3 mb-3 rounded text-red-800 text-sm">{passError}</div>}
            <form onSubmit={handleChangePass} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Contrasena actual</label>
                <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Nueva contrasena</label>
                <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md" required />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded-md text-sm">Guardar</button>
                <button type="button" onClick={() => setShowChangePass(false)} className="bg-gray-200 px-4 py-2 rounded-md text-sm">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-600">Total</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-yellow-700">{stats.pendientes}</p>
            <p className="text-xs text-yellow-600">Pendientes</p>
          </div>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-700">{stats.aprobados}</p>
            <p className="text-xs text-green-600">Vigentes</p>
          </div>
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-700">{stats.rechazados}</p>
            <p className="text-xs text-red-600">Rechazados</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-700">{stats.vencidos}</p>
            <p className="text-xs text-gray-600">Vencidos</p>
          </div>
        </div>
      )}

      {/* Admin tabs */}
      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {[
          { key: "registros", label: "Solicitudes" },
          { key: "decreto", label: "Decreto" },
          { key: "configuracion", label: "Configuracion" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setAdminTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
              adminTab === t.key
                ? "border-b-2 border-green-700 text-green-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Registros Tab */}
      {adminTab === "registros" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="VIGENTE">Vigentes</option>
              <option value="RECHAZADO">Rechazados</option>
              <option value="VENCIDO">Vencidos</option>
            </select>
            <span className="text-sm text-gray-500 self-center">
              Mostrando {registros.length} de {total} registros
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : registros.length === 0 ? (
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
                  {registros.map((r) => (
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

      {/* Configuracion Tab */}
      {adminTab === "configuracion" && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4 max-w-md">
          {configMsg && (
            <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded text-green-800 text-sm">{configMsg}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dias de vigencia del permiso
            </label>
            <input
              type="number"
              value={diasVigencia}
              onChange={(e) => setDiasVigencia(parseInt(e.target.value) || 0)}
              min={1}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <button
            onClick={handleSaveConfig}
            className="bg-green-700 text-white px-6 py-2 rounded-md font-semibold hover:bg-green-800 transition"
          >
            Guardar Configuracion
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
