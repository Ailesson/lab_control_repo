import smtplib
import ssl
import logging

from app.models import Reservation, ReservationStatus

from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings


logger = logging.getLogger(__name__)


def enviar_email(
    destinatario: str,
    assunto: str,
    mensagem: str
) -> bool:

    try:

        email = EmailMessage()

        email["From"] = formataddr((
            settings.SMTP_FROM_NAME,
            settings.SMTP_FROM
        ))

        email["To"] = destinatario

        email["Subject"] = assunto

        email.set_content(mensagem)

        contexto = ssl.create_default_context()

        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=15
        ) as servidor:

            servidor.ehlo()

            servidor.starttls(context=contexto)

            servidor.ehlo()

            servidor.login(
                settings.SMTP_USER,
                settings.SMTP_PASSWORD
            )

            servidor.send_message(email)

        logger.info(
            "E-mail de notificação enviado ao servidor SMTP."
        )

        return True

    except Exception:

        logger.exception(
            "Erro ao enviar e-mail de notificação."
        )

        return False



def notificar_status_reserva(
    reserva: Reservation
):
    if reserva.status ==ReservationStatus.CONFIRMED.value:
        assunto = (
            f"Reserva #{reserva.id} aprovada - "
            "Almoxarifado UFAM"
        )

        mensagem = f"""
Olá, {reserva.user_name}!

Informamos que sua solicitação de reserva foi APROVADA.

DADOS DA RESERVA

Número da reserva: {reserva.id}
Equipamento: {reserva.component_name}
Código: {reserva.component_code}
Quantidade: {reserva.quantity}
Status: Aprovado
Devolução prevista: {reserva.expected_return_date or "Não informada"}

Seu equipamento está aguardando retirada.

Dirija-se ao Almoxarifado do Laboratório de Energia
e Controle para realizar a retirada.

Em caso de dúvidas, entre em contato com a administração.

Atenciosamente,

Almoxarifado do Laboratório de Energia e Controle
Universidade Federal do Amazonas - UFAM

Esta é uma mensagem automática.
"""

    elif reserva.status==ReservationStatus.REFUSED.value:

        assunto = (
            f"Reserva #{reserva.id} recusada - "
            "Almoxarifado UFAM"
        )

        mensagem = f"""
Olá, {reserva.user_name}!

Informamos que sua solicitação de reserva foi RECUSADA.

DADOS DA RESERVA

Número da reserva: {reserva.id}
Equipamento: {reserva.component_name}
Código: {reserva.component_code}
Quantidade: {reserva.quantity}
Status: Recusado

Caso necessite de mais informações sobre a solicitação,
entre em contato com a administração do almoxarifado.

Você também poderá realizar uma nova solicitação
através do sistema.

Atenciosamente,

Almoxarifado do Laboratório de Energia e Controle
Universidade Federal do Amazonas - UFAM

Esta é uma mensagem automática.
"""


    else:

        return False

    return enviar_email(
        destinatario=reserva.user_email,
        assunto=assunto,
        mensagem=mensagem
    )