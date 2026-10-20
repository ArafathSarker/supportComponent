import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("support_component.db")
logging.basicConfig(level=logging.INFO)

DATABASE_URL = settings.DATABASE_URL
engine = None

try:
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        # Test postgres connection with timeout
        test_engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        with test_engine.connect() as conn:
            pass
        engine = test_engine
        logger.info(f"Connected to PostgreSQL database at {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'postgres'}")
except Exception as e:
    if settings.SQLITE_FALLBACK:
        logger.warning(f"Could not connect to PostgreSQL ({e}). Falling back to local SQLite database: sqlite:///./support.db")
        DATABASE_URL = "sqlite:///./support.db"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
