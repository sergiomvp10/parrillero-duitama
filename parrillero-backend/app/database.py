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
        "decreto_titulo": "Decreto de Restricción de Parrillero en Motocicletas\nDecreto No. 095 del 02 de Marzo de 2026",
        "decreto_contenido": """<div class="space-y-6"><div class="bg-blue-50 border border-blue-200 rounded-lg p-6"><h3 class="text-lg font-bold text-blue-800 mb-3">📄 Objeto del Decreto</h3><p class="text-gray-700">Por medio del cual se restringe la circulación de motocicletas con parrillero (acompañante) hombre mayor de 14 años en el municipio de Duitama, Boyacá, como medida de seguridad ciudadana para prevenir la comisión de delitos.</p></div><div class="bg-white border border-gray-200 rounded-lg p-6"><h3 class="text-lg font-bold text-blue-800 mb-3">⚖️ Articulado</h3><div class="space-y-4"><div class="border-l-4 border-blue-600 pl-4"><p class="text-gray-700">ARTÍCULO PRIMERO. Restringir la circulación del parrillero en motocicletas dentro de la jurisdicción del Municipio de Duitama, a partir del 02 de marzo de 2026 y hasta nueva orden; en los horarios de 6:00 pm a 6:00 am en toda la jurisdicción del municipio y en el sector centro, sector terminal antiguo, plaza de mercado, carrera 20, y terminal de transportes la restricción rige las 24 horas del día.</p></div><div class="border-l-4 border-blue-600 pl-4"><p class="text-gray-700">PARAGRAFO 1. Excepciones: • Fuerza pública, organismos de seguridad, tránsito, emergencia y salud. • Empresas de servicios públicos y vigilancia privada (identificados). • Escuelas de conducción autorizadas. • Domiciliarios identificados y autorizados. • Menores de 14 años, mujeres y personas con discapacidad acreditada. • Personas que necesiten acompañante por trabajo (previo registro gratuito en la Alcaldía).</p></div><div class="border-l-4 border-blue-600 pl-4"><p class="text-gray-700">PARAGRAFO 2. Las personas deberán efectuar el registro de excepciones mediante la plataforma web que ha dispuesto la secretaria de gobierno para este fin. El registro es gratuito y los datos serán usados únicamente para verificación y control por parte de las autoridades, conforme a la Ley 1581 de 2012.</p></div><div class="border-l-4 border-blue-600 pl-4"><p class="text-gray-700">PARAGRAFO 3. Se exceptúan de la restricción los acompañantes menores de 14 años, las mujeres y las personas con discapacidad debidamente acreditada.</p></div><div class="border-l-4 border-blue-600 pl-4"><p class="text-gray-700">PARAGRAFO 4. Se exceptúan de la restricción señalada en el presente artículo las personas que presten servicios domiciliarios, siempre que se encuentren plenamente identificadas por la respectiva empresa o cuenten con autorización previa de la Secretaría de Gobierno o de la Secretaría de Tránsito y Transporte, y porten de manera visible el chaleco y el permiso correspondiente.</p></div><div class="border-l-4 border-blue-600 pl-4"><p class="text-gray-700">ARTICULO SEGUNDO : El incumplimiento de la presente medida dará lugar a la imposición de la infracción codificada como C14, sancionada con multa equivalente a medio salario mínimo mensual legal vigente (SMMLV), así como a la inmovilización inmediata del vehículo, de conformidad con lo establecido en la Ley 769 de 2002</p></div></div></div><div class="bg-green-50 border border-green-200 rounded-lg p-6"><h3 class="text-lg font-bold text-green-800 mb-3">📅 Vigencia</h3><p class="text-green-700">Vigente desde las 6:00 pm del 02 de Marzo</p></div></div>""",
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
