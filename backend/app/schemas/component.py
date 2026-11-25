from datetime import datetime

from pydantic import BaseModel, ConfigDict

class ComponentCreate(BaseModel):
    component_id: str
    name: str
    description: str
    quantity: int
    state: str | None = None
    obs: str | None = None
    image_url: str | None = None

class ComponentResponse(BaseModel):
    id: int 
    component_id: str
    name: str
    description: str
    quantity: int
    is_active: bool
    created_at: datetime
    state: str | None = None
    obs: str | None = None
    image_url: str | None = None
    
    model_config = ConfigDict(from_attributes=True)

class ComponentAvailableResponse(BaseModel):
    component_id: str
    name: str
    description: str
    quantity: int
    quantity_total: int
    state: str | None = None
    obs: str | None = None
    image_url: str | None = None
    
    model_config = ConfigDict(from_attributes=True)

class QuantityResponse(BaseModel):
    quantity: int
        
    model_config = ConfigDict(from_attributes=True)
    