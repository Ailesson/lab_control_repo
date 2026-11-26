from pathlib import Path
from uuid import uuid4
from io import BytesIO

from fastapi import UploadFile, HTTPException
from PIL import Image, UnidentifiedImageError


BASE_DIR = Path(__file__).resolve().parents[2]

MEDIA_DIR = BASE_DIR / "media"

EQUIPAMENTOS_DIR = MEDIA_DIR / "equipamentos"

EQUIPAMENTOS_DIR.mkdir(parents=True, exist_ok=True)


MAX_SIZE = 5 * 1024 * 1024

FORMATOS_PERMITIDOS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp"
}


async def salvar_imagem(file: UploadFile) -> str:

    # Leitura da imagem
    try:
        conteudo = await file.read(MAX_SIZE + 1)
    finally:
        await file.close()

    # Validação do tamanho
    if len(conteudo) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail="A imagem deve possuir no máximo 5 MB."
        )

    # Validação do formato real
    try:
        with Image.open(BytesIO(conteudo)) as imagem:

            formato = imagem.format

            imagem.verify()

    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):

        raise HTTPException(
            status_code=400,
            detail="Imagem inválida."
        )

    if formato not in FORMATOS_PERMITIDOS:

        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Utilize JPG, PNG ou WEBP."
        )

    # Gerar um nome único
    extensao = FORMATOS_PERMITIDOS[formato]

    nome_arquivo = f"{uuid4().hex}{extensao}"

    # Caminho físico da imagem
    caminho = EQUIPAMENTOS_DIR / nome_arquivo

    # Salvar imagem
    caminho.write_bytes(conteudo)

    # Caminho que será armazenado no banco
    return f"/media/equipamentos/{nome_arquivo}"