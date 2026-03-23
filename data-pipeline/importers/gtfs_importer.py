"""
GTFS (General Transit Feed Specification) Importer

Downloads and imports Transport for Ireland GTFS data.
Parses stops, routes, and frequencies for transit accessibility analysis.

Data source: https://www.transportforireland.ie/transitData/PT_Data.html
"""

import io
import os
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import pandas as pd
import requests

from config import get_config, GTFSConfig
from utils.supabase_client import SupabaseClient, UpsertResult
from utils.logger import PipelineLogger

logger = PipelineLogger(__name__, "GTFS Importer")

# Dublin bounding box
DUBLIN_BOUNDS = {
    "min_lat": 53.10,
    "max_lat": 53.65,
    "min_lon": -6.60,
    "max_lon": -5.95,
}


class GTFSImporter:
    """
    Imports GTFS transit data from Transport for Ireland.
    """

    def __init__(self, config: Optional[GTFSConfig] = None):
        self.config = config or get_config().gtfs
        self.db = SupabaseClient(batch_size=100)

    def download_gtfs(self) -> bytes:
        """
        Download GTFS zip file.

        Returns:
            Zip file content as bytes
        """
        logger.info(f"Downloading GTFS from {self.config.gtfs_static_url}")

        response = requests.get(
            self.config.gtfs_static_url,
            timeout=120,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; GaffIntelBot/1.0)"
            },
        )
        response.raise_for_status()

        logger.info(f"Downloaded {len(response.content) / 1024 / 1024:.1f} MB")
        return response.content

    def extract_gtfs_files(
        self, content: bytes
    ) -> Dict[str, pd.DataFrame]:
        """
        Extract and parse GTFS files from zip.

        Args:
            content: Zip file content

        Returns:
            Dict of filename -> DataFrame
        """
        logger.info("Extracting GTFS files...")
        data = {}

        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            for filename in zf.namelist():
                if filename.endswith(".txt"):
                    name = filename.replace(".txt", "")
                    try:
                        with zf.open(filename) as f:
                            df = pd.read_csv(f, low_memory=False)
                            data[name] = df
                            logger.debug(f"  {name}: {len(df)} rows")
                    except Exception as e:
                        logger.warning(f"  Could not parse {filename}: {e}")

        return data

    def parse_stops(
        self,
        stops_df: pd.DataFrame,
        stop_times_df: Optional[pd.DataFrame] = None,
        routes_df: Optional[pd.DataFrame] = None,
        trips_df: Optional[pd.DataFrame] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse GTFS stops data.

        Args:
            stops_df: stops.txt DataFrame
            stop_times_df: stop_times.txt DataFrame (for route mapping)
            routes_df: routes.txt DataFrame
            trips_df: trips.txt DataFrame

        Returns:
            List of transit stop records
        """
        logger.info(f"Processing {len(stops_df)} stops...")

        # Filter to Dublin area
        dublin_stops = stops_df[
            (stops_df["stop_lat"] >= DUBLIN_BOUNDS["min_lat"]) &
            (stops_df["stop_lat"] <= DUBLIN_BOUNDS["max_lat"]) &
            (stops_df["stop_lon"] >= DUBLIN_BOUNDS["min_lon"]) &
            (stops_df["stop_lon"] <= DUBLIN_BOUNDS["max_lon"])
        ].copy()

        logger.info(f"Filtered to {len(dublin_stops)} Dublin stops")

        # Build route mapping if data available
        stop_routes: Dict[str, Set[str]] = {}
        stop_operators: Dict[str, str] = {}

        if stop_times_df is not None and trips_df is not None and routes_df is not None:
            logger.info("Building stop-route mapping...")

            # Join stop_times -> trips -> routes
            trip_routes = trips_df[["trip_id", "route_id"]].drop_duplicates()
            route_info = routes_df[["route_id", "route_short_name", "agency_id"]].drop_duplicates()

            stop_trips = stop_times_df[["stop_id", "trip_id"]].drop_duplicates()
            merged = stop_trips.merge(trip_routes, on="trip_id").merge(route_info, on="route_id")

            for _, row in merged.iterrows():
                stop_id = row["stop_id"]
                route = row.get("route_short_name") or row.get("route_id")
                agency = row.get("agency_id", "unknown")

                if stop_id not in stop_routes:
                    stop_routes[stop_id] = set()
                    stop_operators[stop_id] = agency

                if route:
                    stop_routes[stop_id].add(str(route))

        # Transform stops
        records = []
        for _, row in dublin_stops.iterrows():
            stop_id = str(row["stop_id"])

            # Determine stop type from name or code
            stop_name = row.get("stop_name", "")
            stop_type = self._infer_stop_type(stop_name, stop_id)
            operator = self._infer_operator(stop_name, stop_operators.get(stop_id, ""))

            routes = list(stop_routes.get(stop_id, []))

            # Extract Dublin postcode from name if possible
            dublin_postcode = self._extract_dublin_postcode(stop_name)

            records.append({
                "stop_id": stop_id,
                "stop_code": row.get("stop_code"),
                "stop_name": stop_name,
                "stop_type": stop_type,
                "operator": operator,
                "latitude": float(row["stop_lat"]),
                "longitude": float(row["stop_lon"]),
                "routes": routes if routes else None,
                "route_count": len(routes),
                "dublin_postcode": dublin_postcode,
            })

        logger.info(f"Processed {len(records)} transit stop records")
        return records

    def _infer_stop_type(self, name: str, stop_id: str) -> str:
        """Infer transit stop type from name."""
        name_lower = name.lower()
        id_lower = stop_id.lower()

        if any(x in name_lower for x in ["dart", "station"]) and "bus" not in name_lower:
            if "connolly" in name_lower or "tara" in name_lower or "pearse" in name_lower:
                return "dart"
            return "rail"

        if "luas" in name_lower or "luas" in id_lower:
            return "luas"

        if any(x in name_lower for x in ["bus eireann", "buseireann", "expressway"]):
            return "bus_eireann"

        return "bus"

    def _infer_operator(self, name: str, agency: str) -> str:
        """Infer operator from name and agency."""
        name_lower = name.lower()
        agency_lower = str(agency).lower()

        if "luas" in name_lower or "luas" in agency_lower:
            return "luas"

        if "dart" in name_lower:
            return "irish_rail"

        if "irish rail" in agency_lower or "iarnrod" in agency_lower:
            return "irish_rail"

        if "bus eireann" in agency_lower or "buseireann" in agency_lower:
            return "bus_eireann"

        if "go-ahead" in agency_lower or "goahead" in agency_lower:
            return "go_ahead"

        return "dublin_bus"

    def _extract_dublin_postcode(self, name: str) -> Optional[str]:
        """Extract Dublin postcode from stop name."""
        import re

        # Look for Dublin postcode patterns
        match = re.search(r"Dublin\s*(\d{1,2})", name, re.IGNORECASE)
        if match:
            return f"D{match.group(1)}"

        match = re.search(r"\bD(\d{1,2})\b", name)
        if match:
            return f"D{match.group(1)}"

        return None

    def import_gtfs(self, gtfs_content: Optional[bytes] = None) -> UpsertResult:
        """
        Import GTFS data to database.

        Args:
            gtfs_content: Optional pre-downloaded content

        Returns:
            UpsertResult
        """
        logger.start()

        # Download if not provided
        if gtfs_content is None:
            try:
                gtfs_content = self.download_gtfs()
            except Exception as e:
                logger.error(f"Failed to download GTFS: {e}")
                return UpsertResult(inserted=0, updated=0, failed=0, errors=[str(e)])

        # Extract files
        gtfs_data = self.extract_gtfs_files(gtfs_content)

        if "stops" not in gtfs_data:
            logger.error("No stops.txt found in GTFS")
            return UpsertResult(inserted=0, updated=0, failed=0, errors=["No stops.txt"])

        # Parse stops
        records = self.parse_stops(
            stops_df=gtfs_data["stops"],
            stop_times_df=gtfs_data.get("stop_times"),
            routes_df=gtfs_data.get("routes"),
            trips_df=gtfs_data.get("trips"),
        )

        if not records:
            logger.warning("No stops to import")
            return UpsertResult(inserted=0, updated=0, failed=0, errors=[])

        # Upsert to database
        result = self.db.upsert_records(
            table="transit_stops",
            records=records,
            on_conflict="stop_id",
            progress_callback=lambda p, t: logger.progress(p, t, "stops uploaded"),
        )

        logger.complete({
            "Stops processed": len(records),
            "Inserted/Updated": result.inserted,
            "Failed": result.failed,
        })

        return result

    def import_from_file(self, file_path: str) -> UpsertResult:
        """
        Import from local GTFS zip file.

        Args:
            file_path: Path to GTFS zip

        Returns:
            UpsertResult
        """
        logger.info(f"Loading GTFS from {file_path}")

        with open(file_path, "rb") as f:
            content = f.read()

        return self.import_gtfs(content)


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Import TFI GTFS transit data")
    parser.add_argument(
        "--file",
        "-f",
        help="Path to local GTFS zip file",
    )

    args = parser.parse_args()

    from utils.logger import setup_logging
    setup_logging("INFO")

    importer = GTFSImporter()

    if args.file:
        result = importer.import_from_file(args.file)
    else:
        result = importer.import_gtfs()

    print(f"\nImport complete: {result.inserted} transit stops")


if __name__ == "__main__":
    main()
