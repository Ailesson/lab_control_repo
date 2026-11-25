from datetime import datetime

from pydantic import BaseModel, ConfigDict

class ReservationCreate(BaseModel):
    component_id: int
    quantity: int
    expected_return_date: datetime
    justificativa: str
    Obs: str | None = None

class ReservationResponse(BaseModel):
    id: int
    user_id: int
    component_id: int
    quantity: int
    loan_date: datetime
    return_date: datetime | None = None
    status: str
    expected_return_date: datetime
    justificativa: str
    Obs: str | None = None
    component_code: str
    component_name: str
    user_name: str | None = None
    user_matricula: str | None = None

    model_config = ConfigDict(from_attributes=True)
