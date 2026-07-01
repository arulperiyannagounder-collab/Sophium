import os
from sqlmodel import SQLModel, create_engine, Session, select
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url:
    db_url = db_url.strip()
    if db_url.startswith('"') or db_url.startswith("'"):
        db_url = db_url.strip('"').strip("'").strip()

if not db_url:
    db_url = "sqlite:///./sophium.db"
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    db_url,
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
)

def init_db():
    if "sqlite" in db_url:
        db_path = db_url.replace("sqlite:///", "")
        # Remove leading dot-slash if present
        if db_path.startswith("./"):
            db_path = db_path[2:]
            
        if os.path.exists(db_path):
            try:
                # Try loading a User to verify schema matches the new SQLModel columns
                from app.models.user import User
                with Session(engine) as session:
                    session.exec(select(User)).first()
            except Exception as e:
                print(f"Database schema mismatch detected: {e}. Re-initializing database...")
                try:
                    engine.dispose()
                    os.remove(db_path)
                except Exception as del_err:
                    print(f"Failed to remove outdated database file: {del_err}")
                    
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
