"""
MongoDB database connection and GridFS setup using Motor (async driver)
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from typing import Optional

from app.config import MONGODB_URI, DATABASE_NAME


class Database:
    """Singleton database connection manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    db = None
    gridfs: Optional[AsyncIOMotorGridFSBucket] = None
    
    @classmethod
    async def connect(cls):
        """Initialize MongoDB connection"""
        if cls.client is None:
            cls.client = AsyncIOMotorClient(MONGODB_URI)
            cls.db = cls.client[DATABASE_NAME]
            cls.gridfs = AsyncIOMotorGridFSBucket(cls.db)
            
            # Create indexes
            await cls._create_indexes()
            
            print(f"Connected to MongoDB: {DATABASE_NAME}")
    
    @classmethod
    async def disconnect(cls):
        """Close MongoDB connection"""
        if cls.client is not None:
            cls.client.close()
            cls.client = None
            cls.db = None
            cls.gridfs = None
            print("Disconnected from MongoDB")
    
    @classmethod
    async def _create_indexes(cls):
        """Create database indexes for performance"""
        # Users collection
        await cls.db.users.create_index("email", unique=True)
        
        # Memberships collection
        await cls.db.memberships.create_index("user_id")
        await cls.db.memberships.create_index("organization_id")
        await cls.db.memberships.create_index(
            [("user_id", 1), ("organization_id", 1)], 
            unique=True
        )
        
        # Cases collection
        await cls.db.cases.create_index("organization_id")
        await cls.db.cases.create_index("created_by")
        
        # Documents collection
        await cls.db.documents.create_index("case_id")
        await cls.db.documents.create_index("created_by")
        await cls.db.documents.create_index("gridfs_file_id")


# Convenience functions for accessing database components
def get_db():
    """Get the database instance"""
    if Database.db is None:
        raise RuntimeError("Database not connected. Call Database.connect() first.")
    return Database.db


def get_gridfs():
    """Get the GridFS bucket instance"""
    if Database.gridfs is None:
        raise RuntimeError("Database not connected. Call Database.connect() first.")
    return Database.gridfs


# Collection accessors
def get_users_collection():
    return get_db().users


def get_organizations_collection():
    return get_db().organizations


def get_memberships_collection():
    return get_db().memberships


def get_cases_collection():
    return get_db().cases


def get_documents_collection():
    return get_db().documents

