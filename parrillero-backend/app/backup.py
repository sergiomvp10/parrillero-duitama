import smtplib
import csv
import io
import os
import logging
import aiosqlite
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import DB_PATH

logger = logging.getLogger(__name__)

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.environ.get("BACKUP_EMAIL_FROM", "gobiernosec11@gmail.com")
SMTP_PASSWORD = os.environ.get("BACKUP_EMAIL_APP_PASSWORD", "")
BACKUP_RECIPIENT = os.environ.get("BACKUP_EMAIL_TO", "sergiomvp1008@gmail.com")

scheduler = AsyncIOScheduler()


async def generate_backup_csv() -> str:
    """Generate a well-organized CSV with all registros data."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row

    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "UPDATE registros SET estado = 'VENCIDO' WHERE estado = 'VIGENTE' AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < ?",
        (now,)
    )
    await db.commit()

    cursor = await db.execute("SELECT * FROM registros ORDER BY id DESC")
    registros = await cursor.fetchall()
    await db.close()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "ID",
        "--- DATOS DEL CONDUCTOR ---", "", "",
        "--- DATOS DEL PARRILLERO ---", "", "",
        "--- DATOS DE LA MOTOCICLETA ---", "", "",
        "--- SOLICITUD ---", "", "", "", ""
    ])
    writer.writerow([
        "ID",
        "Conductor Nombre", "Conductor Apellido", "Cedula Conductor",
        "Parrillero Nombre", "Parrillero Apellido", "Cedula Parrillero",
        "Placa", "Marca", "Anio", "Color",
        "Motivo", "Descripcion", "Estado", "Fecha Registro", "Fecha Vencimiento"
    ])

    for reg in registros:
        reg_dict = dict(reg)
        writer.writerow([
            reg_dict.get("id", ""),
            reg_dict.get("conductor_nombre", ""),
            reg_dict.get("conductor_apellido", ""),
            reg_dict.get("cedula", ""),
            reg_dict.get("parrillero_nombre", ""),
            reg_dict.get("parrillero_apellido", ""),
            reg_dict.get("cedula_parrillero", ""),
            reg_dict.get("placa", ""),
            reg_dict.get("moto_marca", ""),
            reg_dict.get("moto_anio", ""),
            reg_dict.get("moto_color", ""),
            reg_dict.get("motivo", ""),
            reg_dict.get("descripcion", ""),
            reg_dict.get("estado", ""),
            reg_dict.get("fecha_registro", ""),
            reg_dict.get("fecha_vencimiento", ""),
        ])

    output.seek(0)
    return output.getvalue()


def send_backup_email(csv_content: str) -> bool:
    """Send backup CSV via Gmail SMTP."""
    if not SMTP_PASSWORD:
        logger.error("BACKUP_EMAIL_APP_PASSWORD not configured, skipping backup email")
        return False

    timestamp = datetime.now().strftime("%Y-%m-%d")
    filename = f"backup_parrillero_duitama_{timestamp}.csv"

    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = BACKUP_RECIPIENT
    msg["Subject"] = f"Backup Semanal - Registro Excepciones Parrillero Duitama - {timestamp}"

    body = f"""Backup automatico semanal del sistema de Registro de Excepciones Parrillero Duitama.

Fecha del backup: {timestamp}
Enviado desde: {SMTP_USER}

Este archivo contiene la informacion detallada y organizada de:
- Datos del Conductor (nombre, apellido, cedula)
- Datos del Parrillero/Acompanante (nombre, apellido, cedula)
- Datos de la Motocicleta (placa, marca, anio, color)
- Informacion de la Solicitud (motivo, descripcion, estado, fechas)

Este es un mensaje automatico generado cada viernes.
"""
    msg.attach(MIMEText(body, "plain"))

    attachment = MIMEBase("application", "octet-stream")
    attachment.set_payload(csv_content.encode("utf-8-sig"))
    encoders.encode_base64(attachment)
    attachment.add_header("Content-Disposition", f"attachment; filename={filename}")
    msg.attach(attachment)

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Backup email sent successfully to {BACKUP_RECIPIENT}")
        return True
    except Exception as e:
        logger.error(f"Failed to send backup email: {e}")
        return False


async def run_weekly_backup():
    """Generate CSV and send backup email."""
    logger.info("Starting weekly backup...")
    try:
        csv_content = await generate_backup_csv()
        success = send_backup_email(csv_content)
        if success:
            logger.info("Weekly backup completed successfully")
        else:
            logger.error("Weekly backup failed to send email")
    except Exception as e:
        logger.error(f"Weekly backup error: {e}")


def start_backup_scheduler():
    """Start the APScheduler to run backups every Friday at 8:00 AM Colombia time (UTC-5 = 13:00 UTC)."""
    scheduler.add_job(
        run_weekly_backup,
        CronTrigger(day_of_week="fri", hour=13, minute=0, timezone="UTC"),
        id="weekly_backup",
        name="Weekly Friday Backup",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Backup scheduler started - runs every Friday at 8:00 AM Colombia time (13:00 UTC)")


def stop_backup_scheduler():
    """Stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Backup scheduler stopped")
