"""
BER Certificate Importer

Downloads and imports SEAI BER (Building Energy Rating) database.
Matches certificates to properties by address and eircode.

Data source: https://ndber.seai.ie/BERResearchTool/ber/search.aspx
"""

import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from tqdm import tqdm

from config import get_config, BERConfig
from utils.supabase_client import SupabaseClient, UpsertResult
from utils.logger import PipelineLogger

logger = PipelineLogger(__name__, "BER Importer")


class BERImporter:
    """
    Imports SEAI BER certificate data to Supabase.
    """

    def __init__(self, config: Optional[BERConfig] = None):
        self.config = config or get_config().ber
        self.db = SupabaseClient(batch_size=self.config.batch_size)

    def load_csv(self, file_path: str) -> pd.DataFrame:
        """
        Load BER CSV file.

        Args:
            file_path: Path to BER CSV file

        Returns:
            DataFrame with BER data
        """
        logger.info(f"Loading BER data from {file_path}")

        # BER CSV has specific encoding and column names
        df = pd.read_csv(
            file_path,
            encoding="utf-8-sig",
            low_memory=False,
        )

        logger.info(f"Loaded {len(df)} BER records")
        return df

    def transform_record(self, row: pd.Series) -> Dict[str, Any]:
        """
        Transform a BER CSV row to database format.

        Args:
            row: pandas Series with BER data

        Returns:
            Dict ready for database insert
        """
        # Map CSV columns to database columns
        # Adjust column names based on actual SEAI CSV format
        def safe_get(name: str, default=None):
            return row.get(name, default) if name in row else default

        def parse_date(date_str: Any) -> Optional[str]:
            if pd.isna(date_str):
                return None
            try:
                if isinstance(date_str, str):
                    # Handle various date formats
                    for fmt in ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]:
                        try:
                            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
                        except ValueError:
                            continue
                return None
            except Exception:
                return None

        def parse_float(val: Any) -> Optional[float]:
            if pd.isna(val):
                return None
            try:
                return float(val)
            except (ValueError, TypeError):
                return None

        def parse_int(val: Any) -> Optional[int]:
            if pd.isna(val):
                return None
            try:
                return int(float(val))
            except (ValueError, TypeError):
                return None

        # Build address from components
        address_parts = [
            safe_get("Address1") or safe_get("AddressLine1") or "",
            safe_get("Address2") or safe_get("AddressLine2") or "",
            safe_get("Address3") or safe_get("AddressLine3") or "",
            safe_get("County") or safe_get("CountyName") or "",
        ]
        full_address = ", ".join([p.strip() for p in address_parts if p and p.strip()])

        # Extract BER rating (A1-G)
        ber_rating = safe_get("EnergyRating") or safe_get("BERRating")
        if ber_rating:
            ber_rating = str(ber_rating).strip().upper()

        return {
            "ber_number": safe_get("BERNumber") or safe_get("CertificateNumber"),
            "eircode": safe_get("Eircode") or safe_get("MPRN"),
            "address": full_address,
            "address_line_1": safe_get("Address1") or safe_get("AddressLine1"),
            "address_line_2": safe_get("Address2") or safe_get("AddressLine2"),
            "address_line_3": safe_get("Address3") or safe_get("AddressLine3"),
            "county": safe_get("County") or safe_get("CountyName"),
            "ber_rating": ber_rating,
            "ber_energy_value": parse_float(
                safe_get("EnergyValue") or safe_get("MainSpaceHeating")
            ),
            "carbon_dioxide": parse_float(
                safe_get("CO2") or safe_get("CarbonDioxide")
            ),
            "floor_area_sqm": parse_float(
                safe_get("FloorArea") or safe_get("TotalFloorArea")
            ),
            "year_of_construction": parse_int(
                safe_get("YearOfConstruction") or safe_get("ConstructionYear")
            ),
            "dwelling_type": safe_get("DwellingTypeDescr") or safe_get("DwellingType"),
            "dwelling_type_description": safe_get("DwellingTypeDescr"),
            "type_of_rating": safe_get("TypeOfRating"),
            "energy_rating_band": ber_rating[0] if ber_rating else None,
            "ber_issued_date": parse_date(
                safe_get("DateOfIssue") or safe_get("CertificateDate")
            ),
            "ber_valid_until": parse_date(
                safe_get("ValidUntil") or safe_get("ExpiryDate")
            ),
        }

    def filter_dublin_records(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Filter to Dublin county records only.

        Args:
            df: Full BER DataFrame

        Returns:
            DataFrame with only Dublin records
        """
        dublin_counties = [
            "Dublin",
            "Dublin City",
            "South Dublin",
            "Fingal",
            "Dun Laoghaire-Rathdown",
            "Dun Laoghaire Rathdown",
            "DLR",
        ]

        # Find county column
        county_col = None
        for col in ["County", "CountyName", "COUNTY"]:
            if col in df.columns:
                county_col = col
                break

        if not county_col:
            logger.warning("Could not find county column, returning all records")
            return df

        # Filter
        pattern = "|".join(dublin_counties)
        mask = df[county_col].str.contains(pattern, case=False, na=False)
        dublin_df = df[mask].copy()

        logger.info(f"Filtered to {len(dublin_df)} Dublin records")
        return dublin_df

    def import_from_csv(
        self,
        file_path: str,
        dublin_only: bool = True,
    ) -> UpsertResult:
        """
        Import BER data from CSV file.

        Args:
            file_path: Path to BER CSV file
            dublin_only: Whether to filter to Dublin only

        Returns:
            UpsertResult with import statistics
        """
        logger.start(f"file: {file_path}")

        # Load data
        df = self.load_csv(file_path)

        # Filter to Dublin if requested
        if dublin_only:
            df = self.filter_dublin_records(df)

        if df.empty:
            logger.warning("No records to import")
            return UpsertResult(inserted=0, updated=0, failed=0, errors=[])

        # Transform records
        logger.info("Transforming records...")
        records = []
        for _, row in tqdm(df.iterrows(), total=len(df), desc="Transforming"):
            try:
                record = self.transform_record(row)
                if record.get("ber_number"):  # Must have BER number
                    records.append(record)
            except Exception as e:
                logger.warning(f"Failed to transform record: {e}")

        logger.info(f"Transformed {len(records)} valid records")

        # Upsert to database
        logger.info("Upserting to Supabase...")
        result = self.db.upsert_records(
            table="ber_certificates",
            records=records,
            on_conflict="ber_number",
            progress_callback=lambda p, t: logger.progress(p, t, "records uploaded"),
        )

        logger.complete({
            "Records processed": len(records),
            "Inserted/Updated": result.inserted,
            "Failed": result.failed,
        })

        return result

    def run_address_matching(self) -> Dict[str, int]:
        """
        Match BER certificates to properties by address.
        Updates matched_property_id on ber_certificates.

        Returns:
            Dict with matching statistics
        """
        logger.info("Running address matching...")

        # This would ideally use the address_matcher transformer
        # For now, run a simple RPC function if available
        try:
            result = self.db.execute_rpc("match_ber_to_properties", {})
            logger.info(f"Matched {result} certificates to properties")
            return {"matched": result or 0}
        except Exception as e:
            logger.warning(f"Address matching RPC not available: {e}")
            return {"matched": 0}


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Import SEAI BER data")
    parser.add_argument(
        "--file",
        "-f",
        required=True,
        help="Path to BER CSV file",
    )
    parser.add_argument(
        "--all-counties",
        action="store_true",
        help="Import all counties, not just Dublin",
    )
    parser.add_argument(
        "--match",
        action="store_true",
        help="Run address matching after import",
    )

    args = parser.parse_args()

    from utils.logger import setup_logging
    setup_logging("INFO")

    importer = BERImporter()

    # Import data
    result = importer.import_from_csv(
        file_path=args.file,
        dublin_only=not args.all_counties,
    )

    print(f"\nImport complete: {result.inserted} records processed")

    # Run matching if requested
    if args.match:
        match_result = importer.run_address_matching()
        print(f"Matching complete: {match_result.get('matched', 0)} records matched")


if __name__ == "__main__":
    main()
