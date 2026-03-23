"""
OPW Flood Risk Data Importer

Imports flood zone data from OPW (Office of Public Works) ArcGIS services.
Data includes fluvial (river) and coastal flood zones.

Data source: https://www.floodinfo.ie
ArcGIS Services: https://services1.arcgis.com/bqfNVPUK3HOnCFmA/arcgis/rest/services
"""

import json
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import requests

from config import get_config, FloodConfig
from utils.supabase_client import SupabaseClient, UpsertResult
from utils.logger import PipelineLogger

logger = PipelineLogger(__name__, "Flood Importer")

# Dublin bounding box for filtering
DUBLIN_BBOX = {
    "xmin": -6.60,
    "ymin": 53.10,
    "xmax": -5.95,
    "ymax": 53.65,
}


class FloodImporter:
    """
    Imports OPW flood zone data from ArcGIS services.
    """

    # Known OPW flood layer endpoints
    FLOOD_LAYERS = {
        "fluvial_high": {
            "url": "https://services1.arcgis.com/bqfNVPUK3HOnCFmA/arcgis/rest/services/OPW_Flood_Maps_Fluvial/FeatureServer/0/query",
            "zone_type": "fluvial_high",
            "scenario": "1_in_100",
        },
        "fluvial_medium": {
            "url": "https://services1.arcgis.com/bqfNVPUK3HOnCFmA/arcgis/rest/services/OPW_Flood_Maps_Fluvial/FeatureServer/1/query",
            "zone_type": "fluvial_medium",
            "scenario": "1_in_1000",
        },
        "coastal_high": {
            "url": "https://services1.arcgis.com/bqfNVPUK3HOnCFmA/arcgis/rest/services/OPW_Flood_Maps_Coastal/FeatureServer/0/query",
            "zone_type": "coastal_high",
            "scenario": "1_in_200",
        },
        "coastal_medium": {
            "url": "https://services1.arcgis.com/bqfNVPUK3HOnCFmA/arcgis/rest/services/OPW_Flood_Maps_Coastal/FeatureServer/1/query",
            "zone_type": "coastal_medium",
            "scenario": "1_in_1000",
        },
    }

    def __init__(self, config: Optional[FloodConfig] = None):
        self.config = config or get_config().flood
        self.db = SupabaseClient(batch_size=50)
        self.session = requests.Session()

    def fetch_flood_zones(
        self,
        layer_key: str,
        offset: int = 0,
        batch_size: int = 1000,
    ) -> List[Dict[str, Any]]:
        """
        Fetch flood zones from an ArcGIS layer.

        Args:
            layer_key: Key from FLOOD_LAYERS
            offset: Record offset for pagination
            batch_size: Records per request

        Returns:
            List of feature records
        """
        if layer_key not in self.FLOOD_LAYERS:
            raise ValueError(f"Unknown layer: {layer_key}")

        layer = self.FLOOD_LAYERS[layer_key]

        # Build spatial filter for Dublin area
        params = {
            "where": "1=1",
            "geometry": json.dumps({
                "xmin": DUBLIN_BBOX["xmin"],
                "ymin": DUBLIN_BBOX["ymin"],
                "xmax": DUBLIN_BBOX["xmax"],
                "ymax": DUBLIN_BBOX["ymax"],
                "spatialReference": {"wkid": 4326},
            }),
            "geometryType": "esriGeometryEnvelope",
            "spatialRel": "esriSpatialRelIntersects",
            "inSR": "4326",
            "outSR": "4326",
            "outFields": "*",
            "returnGeometry": "true",
            "f": "geojson",
            "resultOffset": offset,
            "resultRecordCount": batch_size,
        }

        url = f"{layer['url']}?{urlencode(params)}"
        logger.debug(f"Fetching from {layer_key} (offset={offset})")

        response = self.session.get(url, timeout=60)
        response.raise_for_status()

        data = response.json()
        features = data.get("features", [])

        logger.debug(f"  Retrieved {len(features)} features")
        return features

    def transform_feature(
        self,
        feature: Dict[str, Any],
        layer_key: str,
    ) -> Dict[str, Any]:
        """
        Transform a GeoJSON feature to database format.

        Args:
            feature: GeoJSON feature
            layer_key: Source layer key

        Returns:
            Database record
        """
        layer = self.FLOOD_LAYERS[layer_key]
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})

        # Convert geometry to WKT for PostGIS
        # Note: For actual geometry storage, we'd need to use PostGIS functions
        # For now, store as GeoJSON string
        geom_json = json.dumps(geom) if geom else None

        # Extract area if available
        area_sqm = props.get("Shape_Area") or props.get("SHAPE_Area")

        # Generate a zone ID from properties
        zone_id = props.get("OBJECTID") or props.get("FID")
        if zone_id:
            zone_id = f"{layer_key}_{zone_id}"

        return {
            "zone_id": zone_id,
            "zone_type": layer["zone_type"],
            "flood_scenario": layer["scenario"],
            "area_sqm": float(area_sqm) if area_sqm else None,
            "source": "opw_cfram",
            "study_name": props.get("Study_Name") or props.get("STUDY_NAME"),
            # Note: geom would need special handling for PostGIS
            # "geom": geom_json,
        }

    def fetch_all_for_layer(self, layer_key: str) -> List[Dict[str, Any]]:
        """
        Fetch all flood zones for a layer with pagination.

        Args:
            layer_key: Layer to fetch

        Returns:
            List of all records
        """
        all_records = []
        offset = 0
        batch_size = 1000

        while True:
            features = self.fetch_flood_zones(layer_key, offset, batch_size)

            if not features:
                break

            for feature in features:
                record = self.transform_feature(feature, layer_key)
                if record.get("zone_id"):
                    all_records.append(record)

            if len(features) < batch_size:
                break

            offset += batch_size

        return all_records

    def import_layer(self, layer_key: str) -> UpsertResult:
        """
        Import a single flood layer.

        Args:
            layer_key: Layer to import

        Returns:
            UpsertResult
        """
        logger.info(f"Importing {layer_key}...")

        try:
            records = self.fetch_all_for_layer(layer_key)
        except Exception as e:
            logger.error(f"Failed to fetch {layer_key}: {e}")
            return UpsertResult(inserted=0, updated=0, failed=0, errors=[str(e)])

        if not records:
            logger.info(f"No records for {layer_key}")
            return UpsertResult(inserted=0, updated=0, failed=0, errors=[])

        logger.info(f"Upserting {len(records)} flood zones for {layer_key}")

        result = self.db.upsert_records(
            table="flood_zones",
            records=records,
            on_conflict="zone_id",
        )

        return result

    def import_all(self) -> Dict[str, UpsertResult]:
        """
        Import all flood layers.

        Returns:
            Dict of layer -> UpsertResult
        """
        logger.start()

        results = {}
        total = 0

        for layer_key in self.FLOOD_LAYERS:
            result = self.import_layer(layer_key)
            results[layer_key] = result
            total += result.inserted

        logger.complete({
            "Layers processed": len(self.FLOOD_LAYERS),
            "Total zones": total,
        })

        return results

    def check_flood_risk_point(
        self,
        latitude: float,
        longitude: float,
    ) -> Optional[str]:
        """
        Check flood risk at a specific point (for testing).

        Args:
            latitude: Point latitude
            longitude: Point longitude

        Returns:
            Flood zone type or None
        """
        for layer_key, layer in self.FLOOD_LAYERS.items():
            params = {
                "where": "1=1",
                "geometry": f"{longitude},{latitude}",
                "geometryType": "esriGeometryPoint",
                "spatialRel": "esriSpatialRelIntersects",
                "inSR": "4326",
                "outFields": "OBJECTID",
                "returnGeometry": "false",
                "f": "json",
            }

            url = f"{layer['url']}?{urlencode(params)}"

            try:
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                data = response.json()

                if data.get("features"):
                    return layer["zone_type"]
            except Exception:
                continue

        return None


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Import OPW flood zone data")
    parser.add_argument(
        "--layer",
        "-l",
        choices=list(FloodImporter.FLOOD_LAYERS.keys()) + ["all"],
        default="all",
        help="Specific layer to import (default: all)",
    )
    parser.add_argument(
        "--check",
        nargs=2,
        metavar=("LAT", "LON"),
        type=float,
        help="Check flood risk at a point",
    )

    args = parser.parse_args()

    from utils.logger import setup_logging
    setup_logging("INFO")

    importer = FloodImporter()

    if args.check:
        lat, lon = args.check
        risk = importer.check_flood_risk_point(lat, lon)
        print(f"Flood risk at ({lat}, {lon}): {risk or 'none'}")
        return

    if args.layer == "all":
        results = importer.import_all()
        total = sum(r.inserted for r in results.values())
        print(f"\nImport complete: {total} flood zones across {len(results)} layers")
    else:
        result = importer.import_layer(args.layer)
        print(f"\nImport complete: {result.inserted} flood zones")


if __name__ == "__main__":
    main()
