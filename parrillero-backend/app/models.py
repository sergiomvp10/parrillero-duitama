from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserLogin(BaseModel):
    username: str
    password: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegistroCreate(BaseModel):
    conductor_nombre: str
    conductor_apellido: str
    cedula: str = Field(..., min_length=6, max_length=12, pattern=r"^\d{6,12}$")
    telefono: Optional[str] = None
    genero: str = "masculino"
    fecha_nacimiento: Optional[str] = None
    placa: str
    motivo: str
    descripcion: Optional[str] = None
    acepta_politica_datos: bool = False
    parrillero_nombre: Optional[str] = None
    parrillero_apellido: Optional[str] = None
    cedula_parrillero: Optional[str] = None
    moto_marca: Optional[str] = None
    moto_anio: Optional[str] = None
    moto_color: Optional[str] = None


class RegistroResponse(BaseModel):
    id: int
    conductor_nombre: str
    conductor_apellido: str
    cedula: str
    telefono: Optional[str] = None
    genero: str
    fecha_nacimiento: Optional[str] = None
    placa: str
    motivo: str
    descripcion: Optional[str] = None
    estado: str
    fecha_registro: str
    fecha_vencimiento: Optional[str] = None
    acepta_politica_datos: int = 0
    parrillero_nombre: Optional[str] = None
    parrillero_apellido: Optional[str] = None
    cedula_parrillero: Optional[str] = None
    moto_marca: Optional[str] = None
    moto_anio: Optional[str] = None
    moto_color: Optional[str] = None


class RegistroUpdate(BaseModel):
    estado: str


class ConsultaResponse(BaseModel):
    conductor_nombre: str
    conductor_apellido: str
    cedula: str
    placa: str
    estado: str
    fecha_registro: str
    fecha_vencimiento: Optional[str] = None
    parrillero_nombre: Optional[str] = None
    parrillero_apellido: Optional[str] = None
    cedula_parrillero: Optional[str] = None
    moto_marca: Optional[str] = None
    moto_anio: Optional[str] = None
    moto_color: Optional[str] = None
    motivo: Optional[str] = None


class DecretoResponse(BaseModel):
    titulo: str
    contenido: str


class DecretoUpdate(BaseModel):
    titulo: str
    contenido: str


class ConfiguracionUpdate(BaseModel):
    dias_vigencia: int


class EstadisticasResponse(BaseModel):
    total: int
    pendientes: int
    aprobados: int
    rechazados: int
    vencidos: int


class PaginatedRegistros(BaseModel):
    registros: list
    total: int
    page: int
    per_page: int
    total_pages: int
