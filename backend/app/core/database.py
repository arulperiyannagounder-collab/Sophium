import os
from sqlmodel import SQLModel, create_engine, Session, select
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

def init_db():
    if "sqlite" in settings.DATABASE_URL:
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
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
