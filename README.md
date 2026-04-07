# Registro de Excepciones Parrillero - Duitama

Plataforma web para la gestion de excepciones al decreto de restriccion de parrillero en el municipio de Duitama, Boyaca.

## Estructura del Proyecto

```
parrillero-app/
├── parrillero-backend/    # FastAPI backend (Python)
│   ├── app/
│   │   ├── main.py        # API endpoints
│   │   ├── database.py    # SQLite database
│   │   ├── models.py      # Pydantic models
│   │   └── auth.py        # JWT authentication
│   ├── Dockerfile
│   ├── fly.toml
│   └── pyproject.toml
├── parrillero-frontend/   # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx        # Main application
│   │   └── lib/api.ts     # API client
│   ├── .env
│   └── package.json
└── README.md
```

## Funcionalidades

- **Decreto**: Visualizacion del decreto de restriccion de parrillero
- **Solicitar Excepcion**: Formulario con CAPTCHA, politica de datos, validaciones
- **Consulta Publica**: Busqueda por placa con datos enmascarados
- **Panel Admin**: Login con bloqueo por intentos, gestion de solicitudes, editar decreto, configurar vigencia, estadisticas
- **Vencimiento automatico**: Las excepciones vigentes se vencen automaticamente segun la configuracion

## Desarrollo Local

### Backend
```bash
cd parrillero-backend
poetry install
poetry run fastapi dev app/main.py
# Servidor en http://localhost:8000
```

### Frontend
```bash
cd parrillero-frontend
npm install
npm run dev
# Servidor en http://localhost:5173
```

### Credenciales por defecto
- Usuario: `admin`
- Contrasena: `admin2024`

## Despliegue en Fly.io

### Backend
```bash
cd parrillero-backend

# Instalar flyctl si no lo tienes
curl -L https://fly.io/install.sh | sh

# Autenticarse con tu API key
fly auth token <TU_API_KEY>

# Crear la app
fly apps create parrillero-duitama

# Crear volumen persistente para la base de datos
fly volumes create parrillero_data --region mia --size 1

# Desplegar
fly deploy

# La app estara en https://parrillero-duitama.fly.dev
```

### Frontend
```bash
cd parrillero-frontend

# Actualizar .env con la URL del backend desplegado
echo "VITE_API_URL=https://parrillero-duitama.fly.dev" > .env

# Construir
npm run build

# El directorio dist/ se puede desplegar en cualquier hosting estatico
# (Vercel, Netlify, Cloudflare Pages, etc.)
```

### Configurar Cloudflare (opcional)
Si deseas usar el dominio `secgobiernoduitamacontrolmovilidad.com`:
1. Actualizar el Worker `proxy-app` para apuntar a la nueva URL de Fly.io
2. O configurar un CNAME apuntando a `parrillero-duitama.fly.dev`

## Tecnologias

- **Backend**: FastAPI, SQLite (aiosqlite), JWT (PyJWT), bcrypt
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Despliegue**: Fly.io con volumen persistente
