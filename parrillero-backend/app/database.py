import aiosqlite
import os
import bcrypt

DB_DIR = "/data" if os.path.isdir("/data") else os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "app.db")

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA busy_timeout=5000")
    try:
        yield db
    finally:
        await db.close()

async def init_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA busy_timeout=5000")

    await db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            failed_attempts INTEGER DEFAULT 0,
            locked_until TIMESTAMP NULL
        )
    """)

    await db.execute("""
        CREATE TABLE IF NOT EXISTS registros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conductor_nombre TEXT NOT NULL,
            conductor_apellido TEXT NOT NULL,
            cedula TEXT NOT NULL,
            genero TEXT NOT NULL DEFAULT 'masculino',
            fecha_nacimiento TEXT,
            placa TEXT NOT NULL,
            motivo TEXT NOT NULL,
            descripcion TEXT,
            estado TEXT DEFAULT 'PENDIENTE',
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_vencimiento TIMESTAMP NULL,
            acepta_politica_datos INTEGER DEFAULT 0
        )
    """)

    await db.execute("""
        CREATE TABLE IF NOT EXISTS configuracion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL
        )
    """)

    # Create indexes
    await db.execute("CREATE INDEX IF NOT EXISTS idx_registros_placa ON registros(placa)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_registros_cedula ON registros(cedula)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_registros_estado ON registros(estado)")

    # Seed default admin user if not exists
    cursor = await db.execute("SELECT COUNT(*) as cnt FROM users WHERE username = 'admin'")
    row = await cursor.fetchone()
    if row[0] == 0:
        password_hash = bcrypt.hashpw("admin2024".encode(), bcrypt.gensalt()).decode()
        await db.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            ("admin", password_hash, "admin")
        )

    # Seed default configuration
    defaults = {
        "dias_vigencia": "90",
        "decreto_titulo": "Decreto de Restriccion de Parrillero",
        "decreto_contenido": """<h2>Objeto del Decreto</h2>
<p>El presente decreto tiene por objeto restringir la circulacion de motocicletas con acompanante (parrillero) en el municipio de Duitama, Boyaca, como medida preventiva para garantizar la seguridad ciudadana.</p>

<h2>Ambito de Aplicacion</h2>
<p>La restriccion aplica unicamente a <strong>hombres mayores de 14 anos</strong> que circulen como acompanantes (parrilleros) en motocicletas dentro del perimetro urbano del municipio de Duitama.</p>

<h2>Excepciones</h2>
<p>Podran solicitar excepcion a esta medida las personas que demuestren necesidad por motivos de:</p>
<ul>
<li><strong>Trabajo:</strong> Personas que requieran desplazarse como parrillero por razones laborales.</li>
<li><strong>Educativo:</strong> Estudiantes que necesiten transporte a instituciones educativas.</li>
<li><strong>Familiar:</strong> Situaciones familiares que requieran el acompanamiento.</li>
<li><strong>Otro:</strong> Cualquier otra razon justificada.</li>
</ul>

<h2>Procedimiento</h2>
<p>Las personas interesadas en obtener la excepcion deberan:</p>
<ol>
<li>Diligenciar el formulario de solicitud de excepcion en esta plataforma.</li>
<li>Esperar la revision y aprobacion por parte de la autoridad competente.</li>
<li>Una vez aprobada, la excepcion tendra una vigencia determinada por la configuracion del sistema.</li>
</ol>

<h2>Sanciones</h2>
<p>El incumplimiento de esta medida acarreara las sanciones previstas en el Codigo Nacional de Policia y Convivencia.</p>""",
    }

    for clave, valor in defaults.items():
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM configuracion WHERE clave = ?", (clave,))
        row = await cursor.fetchone()
        if row[0] == 0:
            await db.execute(
                "INSERT INTO configuracion (clave, valor) VALUES (?, ?)",
                (clave, valor)
            )

    # Auto-migrate: add columns if missing
    cursor = await db.execute("PRAGMA table_info(registros)")
    columns = [row[1] for row in await cursor.fetchall()]

    migrations = {
        "genero": "ALTER TABLE registros ADD COLUMN genero TEXT NOT NULL DEFAULT 'masculino'",
        "fecha_nacimiento": "ALTER TABLE registros ADD COLUMN fecha_nacimiento TEXT",
        "fecha_vencimiento": "ALTER TABLE registros ADD COLUMN fecha_vencimiento TIMESTAMP NULL",
        "acepta_politica_datos": "ALTER TABLE registros ADD COLUMN acepta_politica_datos INTEGER DEFAULT 0",
        "conductor_apellido": "ALTER TABLE registros ADD COLUMN conductor_apellido TEXT NOT NULL DEFAULT ''",
    }

    for col, sql in migrations.items():
        if col not in columns:
            try:
                await db.execute(sql)
            except Exception:
                pass

    await db.commit()
    await db.close()
