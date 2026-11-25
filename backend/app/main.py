from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import users_router, auth_router, component_router, reservation_router
from pathlib import Path
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent.parent

MEDIA_DIR = BASE_DIR / "media"
EQUIPAMENTOS_DIR = MEDIA_DIR / "equipamentos"

EQUIPAMENTOS_DIR.mkdir(parents=True, exist_ok=True)




app = FastAPI(title="ALMOXARIFADO LABORÁTORIO DE ENERGIA E CONTROLE", version = "0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.mount(
    "/media",
    StaticFiles(directory=str(MEDIA_DIR)),
    name="media"
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(component_router)
app.include_router(reservation_router)
