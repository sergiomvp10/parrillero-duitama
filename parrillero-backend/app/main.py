from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional
import aiosqlite
import os
import math

from app.database import get_db, init_db, DB_DIR
from app.models import (
    UserLogin, ChangePassword, TokenResponse, RegistroCreate, RegistroResponse,
    RegistroUpdate, ConsultaResponse, DecretoResponse, DecretoUpdate,
    ConfiguracionUpdate, EstadisticasResponse, PaginatedRegistros
)
from app.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user
)

# Login attempt tracking (in-memory)
login_attempts: dict = {}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 5

UPLOAD_DIR = os.path.join(DB_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await check_vencimientos()
    yield


app = FastAPI(lifespan=lifespan)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


async def check_vencimientos():
    from app.database import DB_PATH
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "UPDATE registros SET estado = 'VENCIDO' WHERE estado = 'VIGENTE' AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < ?",
        (now,)
    )
    await db.commit()
    await db.close()


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# ============ AUTH ============

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, db: aiosqlite.Connection = Depends(get_db)):
    ip_key = data.username
    now = datetime.now(timezone.utc)

    if ip_key in login_attempts:
        attempts, locked_until = login_attempts[ip_key]
        if locked_until and now < locked_until:
            remaining = int((locked_until - now).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Cuenta bloqueada. Intente de nuevo en {remaining} segundos."
            )
        if locked_until and now >= locked_until:
            login_attempts[ip_key] = (0, None)

    cursor = await db.execute(
        "SELECT id, username, password_hash, role FROM users WHERE username = ?",
        (data.username,)
    )
    user = await cursor.fetchone()

    if not user or not verify_password(data.password, user["password_hash"]):
        attempts = login_attempts.get(ip_key, (0, None))[0] + 1
        locked_until = None
        if attempts >= MAX_LOGIN_ATTEMPTS:
            locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
        login_attempts[ip_key] = (attempts, locked_until)

        remaining = MAX_LOGIN_ATTEMPTS - attempts
        if remaining > 0:
            raise HTTPException(
                status_code=401,
                detail=f"Credenciales incorrectas. {remaining} intentos restantes."
            )
        else:
            raise HTTPException(
                status_code=429,
                detail=f"Cuenta bloqueada por {LOCKOUT_MINUTES} minutos tras {MAX_LOGIN_ATTEMPTS} intentos fallidos."
            )

    login_attempts.pop(ip_key, None)
    token = create_access_token({"user_id": user["id"], "username": user["username"], "role": user["role"]})
    return TokenResponse(access_token=token)


@app.post("/api/auth/change-password")
async def change_password(
    data: ChangePassword,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute(
        "SELECT password_hash FROM users WHERE id = ?",
        (current_user["user_id"],)
    )
    user = await cursor.fetchone()
    if not user or not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Contrasena actual incorrecta")

    new_hash = get_password_hash(data.new_password)
    await db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (new_hash, current_user["user_id"])
    )
    await db.commit()
    return {"message": "Contrasena actualizada exitosamente"}


# ============ REGISTROS (SOLICITUDES) ============

@app.post("/api/registros", response_model=RegistroResponse)
async def crear_registro(data: RegistroCreate, db: aiosqlite.Connection = Depends(get_db)):
    if not data.cedula.isdigit() or len(data.cedula) < 6 or len(data.cedula) > 12:
        raise HTTPException(status_code=400, detail="La cedula debe tener entre 6 y 12 digitos numericos")

    if not data.acepta_politica_datos:
        raise HTTPException(status_code=400, detail="Debe aceptar la politica de tratamiento de datos")

    placa_upper = data.placa.upper().strip()

    cursor = await db.execute(
        """INSERT INTO registros 
        (conductor_nombre, conductor_apellido, cedula, genero, fecha_nacimiento, placa, motivo, descripcion, estado, acepta_politica_datos) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?)""",
        (
            data.conductor_nombre.strip(),
            data.conductor_apellido.strip(),
            data.cedula.strip(),
            data.genero,
            data.fecha_nacimiento,
            placa_upper,
            data.motivo,
            data.descripcion,
            1 if data.acepta_politica_datos else 0
        )
    )
    await db.commit()
    registro_id = cursor.lastrowid

    cursor = await db.execute("SELECT * FROM registros WHERE id = ?", (registro_id,))
    registro = await cursor.fetchone()
    return dict(registro)


@app.get("/api/registros")
async def listar_registros(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "UPDATE registros SET estado = 'VENCIDO' WHERE estado = 'VIGENTE' AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < ?",
        (now,)
    )
    await db.commit()

    offset = (page - 1) * per_page

    if estado:
        count_cursor = await db.execute(
            "SELECT COUNT(*) as cnt FROM registros WHERE estado = ?", (estado,)
        )
        count_row = await count_cursor.fetchone()
        total = count_row[0]

        cursor = await db.execute(
            "SELECT * FROM registros WHERE estado = ? ORDER BY id DESC LIMIT ? OFFSET ?",
            (estado, per_page, offset)
        )
    else:
        count_cursor = await db.execute("SELECT COUNT(*) as cnt FROM registros")
        count_row = await count_cursor.fetchone()
        total = count_row[0]

        cursor = await db.execute(
            "SELECT * FROM registros ORDER BY id DESC LIMIT ? OFFSET ?",
            (per_page, offset)
        )

    registros = [dict(row) for row in await cursor.fetchall()]
    total_pages = max(1, math.ceil(total / per_page))

    return {
        "registros": registros,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages
    }


@app.get("/api/registros/{registro_id}")
async def obtener_registro(
    registro_id: int,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute("SELECT * FROM registros WHERE id = ?", (registro_id,))
    registro = await cursor.fetchone()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return dict(registro)


@app.put("/api/registros/{registro_id}/estado")
async def actualizar_estado(
    registro_id: int,
    data: RegistroUpdate,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute("SELECT * FROM registros WHERE id = ?", (registro_id,))
    registro = await cursor.fetchone()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    new_estado = data.estado.upper()
    fecha_vencimiento = None

    if new_estado == "VIGENTE":
        config_cursor = await db.execute(
            "SELECT valor FROM configuracion WHERE clave = 'dias_vigencia'"
        )
        config_row = await config_cursor.fetchone()
        dias = int(config_row["valor"]) if config_row else 90
        fecha_vencimiento = (datetime.now(timezone.utc) + timedelta(days=dias)).isoformat()
        await db.execute(
            "UPDATE registros SET estado = ?, fecha_vencimiento = ? WHERE id = ?",
            (new_estado, fecha_vencimiento, registro_id)
        )
    else:
        await db.execute(
            "UPDATE registros SET estado = ? WHERE id = ?",
            (new_estado, registro_id)
        )

    await db.commit()

    cursor = await db.execute("SELECT * FROM registros WHERE id = ?", (registro_id,))
    updated = await cursor.fetchone()
    return dict(updated)


@app.delete("/api/registros/{registro_id}")
async def eliminar_registro(
    registro_id: int,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute("SELECT * FROM registros WHERE id = ?", (registro_id,))
    registro = await cursor.fetchone()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    await db.execute("DELETE FROM registros WHERE id = ?", (registro_id,))
    await db.commit()
    return {"message": "Registro eliminado"}


# ============ CONSULTA PUBLICA ============

@app.get("/api/consulta")
async def consulta_publica(
    placa: str = Query(..., min_length=1),
    db: aiosqlite.Connection = Depends(get_db)
):
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "UPDATE registros SET estado = 'VENCIDO' WHERE estado = 'VIGENTE' AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < ?",
        (now,)
    )
    await db.commit()

    placa_upper = placa.upper().strip()
    cursor = await db.execute(
        "SELECT conductor_nombre, conductor_apellido, cedula, placa, estado, fecha_registro, fecha_vencimiento FROM registros WHERE placa = ? ORDER BY id DESC",
        (placa_upper,)
    )
    registros = await cursor.fetchall()

    if not registros:
        raise HTTPException(status_code=404, detail="No se encontraron registros para esta placa")

    results = []
    for reg in registros:
        reg_dict = dict(reg)
        nombre = reg_dict["conductor_nombre"]
        apellido = reg_dict["conductor_apellido"]
        cedula = reg_dict["cedula"]

        masked_nombre = nombre[:3] + "***" if len(nombre) > 3 else nombre
        masked_apellido = apellido[:3] + "***" if len(apellido) > 3 else apellido
        masked_cedula = cedula[:3] + "***" if len(cedula) > 3 else cedula

        results.append({
            "conductor_nombre": masked_nombre,
            "conductor_apellido": masked_apellido,
            "cedula": masked_cedula,
            "placa": reg_dict["placa"],
            "estado": reg_dict["estado"],
            "fecha_registro": reg_dict["fecha_registro"],
            "fecha_vencimiento": reg_dict["fecha_vencimiento"],
        })

    return results


# ============ DECRETO ============

@app.get("/api/decreto", response_model=DecretoResponse)
async def obtener_decreto(db: aiosqlite.Connection = Depends(get_db)):
    titulo_cursor = await db.execute(
        "SELECT valor FROM configuracion WHERE clave = 'decreto_titulo'"
    )
    titulo_row = await titulo_cursor.fetchone()

    contenido_cursor = await db.execute(
        "SELECT valor FROM configuracion WHERE clave = 'decreto_contenido'"
    )
    contenido_row = await contenido_cursor.fetchone()

    return DecretoResponse(
        titulo=titulo_row["valor"] if titulo_row else "Decreto",
        contenido=contenido_row["valor"] if contenido_row else ""
    )


@app.put("/api/decreto")
async def actualizar_decreto(
    data: DecretoUpdate,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    await db.execute(
        "UPDATE configuracion SET valor = ? WHERE clave = 'decreto_titulo'",
        (data.titulo,)
    )
    await db.execute(
        "UPDATE configuracion SET valor = ? WHERE clave = 'decreto_contenido'",
        (data.contenido,)
    )
    await db.commit()
    return {"message": "Decreto actualizado"}


# ============ CONFIGURACION ============

@app.get("/api/configuracion")
async def obtener_configuracion(
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute("SELECT clave, valor FROM configuracion")
    rows = await cursor.fetchall()
    config = {row["clave"]: row["valor"] for row in rows}
    return config


@app.put("/api/configuracion")
async def actualizar_configuracion(
    data: ConfiguracionUpdate,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    await db.execute(
        "INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('dias_vigencia', ?)",
        (str(data.dias_vigencia),)
    )
    await db.commit()
    return {"message": "Configuracion actualizada"}


# ============ ESTADISTICAS ============

@app.get("/api/estadisticas", response_model=EstadisticasResponse)
async def obtener_estadisticas(
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "UPDATE registros SET estado = 'VENCIDO' WHERE estado = 'VIGENTE' AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < ?",
        (now,)
    )
    await db.commit()

    total_cursor = await db.execute("SELECT COUNT(*) as cnt FROM registros")
    total = (await total_cursor.fetchone())[0]

    pend_cursor = await db.execute("SELECT COUNT(*) as cnt FROM registros WHERE estado = 'PENDIENTE'")
    pendientes = (await pend_cursor.fetchone())[0]

    aprob_cursor = await db.execute("SELECT COUNT(*) as cnt FROM registros WHERE estado = 'VIGENTE'")
    aprobados = (await aprob_cursor.fetchone())[0]

    rech_cursor = await db.execute("SELECT COUNT(*) as cnt FROM registros WHERE estado = 'RECHAZADO'")
    rechazados = (await rech_cursor.fetchone())[0]

    venc_cursor = await db.execute("SELECT COUNT(*) as cnt FROM registros WHERE estado = 'VENCIDO'")
    vencidos = (await venc_cursor.fetchone())[0]

    return EstadisticasResponse(
        total=total,
        pendientes=pendientes,
        aprobados=aprobados,
        rechazados=rechazados,
        vencidos=vencidos
    )


# ============ FILE UPLOAD ============

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    content = await file.read()
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(content)
    return {"filename": file.filename, "url": f"/api/uploads/{file.filename}"}


@app.get("/api/uploads/{filename}")
async def get_uploaded_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(file_path)
