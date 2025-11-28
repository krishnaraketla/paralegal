"""
Membership model (many-to-many relationship between users and organizations)
"""
from datetime import datetime
from pydantic import BaseModel, Field


class MembershipBase(BaseModel):
    """Base membership fields"""
    user_id: str
    organization_id: str


class MembershipCreate(MembershipBase):
    """Fields for creating a membership"""
    pass


class Membership(MembershipBase):
    """Membership document as stored in MongoDB"""
    id: str = Field(alias="_id")
    joined_at: datetime
    
    class Config:
        populate_by_name = True


class MembershipResponse(BaseModel):
    """Membership response for API"""
    id: str
    user_id: str
    organization_id: str
    joined_at: datetime

