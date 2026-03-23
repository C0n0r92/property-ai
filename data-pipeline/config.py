"""
Gaff Intel Data Pipeline Configuration

Loads environment variables and provides configuration for all importers.
"""

import os
from dataclasses import dataclass
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()


@dataclass
class SupabaseConfig:
    """Supabase connection configuration."""
    url: str
    service_key: str

    @classmethod
    def from_env(cls) -> "SupabaseConfig":
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not url or not key:
            raise ValueError(
                "Missing Supabase configuration. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
            )

        return cls(url=url, service_key=key)


@dataclass
class BERConfig:
    """SEAI BER database configuration."""
    # Download URL for BER research tool export
    download_url: str = "https://ndber.seai.ie/BERResearchTool/ber/search.aspx"
    # Local file path (if downloading manually)
    local_file: str = "./data/ber_database.csv"
    # Batch size for database operations
    batch_size: int = 1000


@dataclass
class CSOConfig:
    """CSO JSON-stat API configuration."""
    base_url: str = "https://data.cso.ie"

    # Housing-related table IDs
    tables: dict = None

    def __post_init__(self):
        self.tables = {
            "HPM09": "/api/v1/en/StatbankServices/statbank/HPM09.json",  # House Price Index
            "HSA15": "/api/v1/en/StatbankServices/statbank/HSA15.json",  # Completions
            "BHA02": "/api/v1/en/StatbankServices/statbank/BHA02.json",  # Mortgages
        }


@dataclass
class BPFIConfig:
    """BPFI mortgage data configuration."""
    publications_url: str = "https://www.bpfi.ie/research-publications/"
    # Pattern to match mortgage statistics Excel files
    file_pattern: str = "mortgage-market-profile"


@dataclass
class GTFSConfig:
    """Transport for Ireland GTFS configuration."""
    gtfs_url: str = "https://www.transportforireland.ie/transitData/Data/GTFS_Realtime.zip"
    gtfs_static_url: str = "https://www.transportforireland.ie/transitData/Data/GTFS.zip"
    local_dir: str = "./data/gtfs"


@dataclass
class FloodConfig:
    """OPW flood risk configuration."""
    # Flood zones ArcGIS REST service
    arcgis_url: str = "https://services1.arcgis.com/bqfNVPUK3HOnCFmA/arcgis/rest/services"
    # Specific layer for flood zones
    fluvial_layer: str = "Flood_Maps_Fluvial"
    coastal_layer: str = "Flood_Maps_Coastal"


@dataclass
class Config:
    """Main configuration class."""
    supabase: SupabaseConfig
    ber: BERConfig
    cso: CSOConfig
    bpfi: BPFIConfig
    gtfs: GTFSConfig
    flood: FloodConfig

    # General settings
    log_level: str = "INFO"
    batch_size: int = 100
    max_retries: int = 3
    retry_delay: float = 1.0

    @classmethod
    def load(cls) -> "Config":
        """Load configuration from environment."""
        return cls(
            supabase=SupabaseConfig.from_env(),
            ber=BERConfig(),
            cso=CSOConfig(),
            bpfi=BPFIConfig(),
            gtfs=GTFSConfig(),
            flood=FloodConfig(),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )


def get_supabase_client() -> Client:
    """Get a configured Supabase client."""
    config = SupabaseConfig.from_env()
    return create_client(config.url, config.service_key)


# Global configuration instance
_config: Config | None = None


def get_config() -> Config:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = Config.load()
    return _config
