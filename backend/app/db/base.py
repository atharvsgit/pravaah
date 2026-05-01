"""
Database base configuration and declarative base.
This module provides the SQLAlchemy declarative base for all models.
"""

from sqlalchemy.orm import declarative_base

# Create the declarative base for all models
Base = declarative_base()

# Export the Base for use in other modules
__all__ = ["Base"]