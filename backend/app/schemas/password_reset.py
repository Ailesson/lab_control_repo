from pydantic import BaseModel


class RecuperacaoSenha(BaseModel):

    cpf: str


class RedefinirSenha(BaseModel):

    token: str
    nova_senha: str 
    confirmar_senha: str