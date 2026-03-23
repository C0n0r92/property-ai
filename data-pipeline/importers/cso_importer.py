"""
CSO (Central Statistics Office) Data Importer

Fetches housing-related statistics from CSO JSON-stat2 API.
Imports to cso_indicators table.

Tables:
- HPM09: Residential Property Price Index (monthly, by region)
- HSA15: New Dwelling Completions by county
- BHA02: Mortgage Drawdowns by county

Data source: https://data.cso.ie
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from pyjstat import pyjstat

from config import get_config, CSOConfig
from utils.supabase_client import SupabaseClient, UpsertResult
from utils.logger import PipelineLogger

logger = PipelineLogger(__name__, "CSO Importer")


class CSOImporter:
    """
    Imports CSO housing statistics via JSON-stat2 API.
    """

    def __init__(self, config: Optional[CSOConfig] = None):
        self.config = config or get_config().cso
        self.db = SupabaseClient(batch_size=100)

    def fetch_table(self, table_id: str) -> List[Dict[str, Any]]:
        """
        Fetch a CSO table via JSON-stat2 API.

        Args:
            table_id: CSO table identifier (e.g., HPM09)

        Returns:
            List of flattened records
        """
        if table_id not in self.config.tables:
            raise ValueError(f"Unknown table ID: {table_id}")

        url = f"{self.config.base_url}{self.config.tables[table_id]}"
        logger.info(f"Fetching {table_id} from {url}")

        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Parse JSON-stat format
        json_data = response.json()

        # Convert to pandas DataFrame using pyjstat
        # The CSO API returns data in JSON-stat format
        try:
            df = pyjstat.from_json_stat(json_data)[0]
            records = df.to_dict("records")
            logger.info(f"Fetched {len(records)} records from {table_id}")
            return records
        except Exception as e:
            logger.warning(f"pyjstat parsing failed, using manual parsing: {e}")
            return self._manual_parse(json_data, table_id)

    def _manual_parse(
        self, json_data: Dict[str, Any], table_id: str
    ) -> List[Dict[str, Any]]:
        """
        Manually parse JSON-stat when pyjstat fails.

        Args:
            json_data: Raw JSON response
            table_id: Table identifier

        Returns:
            List of parsed records
        """
        records = []

        # Get dimensions
        dimension = json_data.get("dimension", {})
        values = json_data.get("value", [])
        sizes = json_data.get("size", [])

        if not values or not dimension:
            return records

        # Get dimension labels and categories
        dim_info = []
        for dim_name in json_data.get("id", []):
            dim = dimension.get(dim_name, {})
            categories = dim.get("category", {})
            labels = categories.get("label", {})
            indices = categories.get("index", {})

            # Convert to ordered list
            ordered = [""] * len(labels)
            for key, idx in indices.items():
                ordered[idx] = labels.get(key, key)

            dim_info.append({
                "name": dim.get("label", dim_name),
                "values": ordered,
            })

        # Iterate through all combinations
        if sizes and values:
            import itertools

            indices = [range(s) for s in sizes]
            for i, combo in enumerate(itertools.product(*indices)):
                if i >= len(values):
                    break

                record = {"value": values[i]}
                for j, idx in enumerate(combo):
                    if j < len(dim_info):
                        record[dim_info[j]["name"]] = (
                            dim_info[j]["values"][idx]
                            if idx < len(dim_info[j]["values"])
                            else ""
                        )

                records.append(record)

        return records

    def transform_hpm09(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform HPM09 (House Price Index) records.

        Args:
            records: Raw records from CSO

        Returns:
            Transformed records for database
        """
        transformed = []

        for record in records:
            # Extract fields (column names vary)
            period = record.get("Month") or record.get("Quarter") or record.get("TLIST(M1)")
            region = record.get("Area") or record.get("Region") or record.get("STATISTIC")
            value = record.get("value") or record.get("Value")

            if not period or value is None:
                continue

            # Parse period to date
            period_date = self._parse_period(period)

            transformed.append({
                "table_id": "HPM09",
                "table_name": "Residential Property Price Index",
                "period": period,
                "period_date": period_date,
                "region": region or "State",
                "metric": "Property Price Index",
                "value": float(value) if value else None,
                "unit": "Index (2015=100)",
                "source_url": f"{self.config.base_url}{self.config.tables['HPM09']}",
            })

        return transformed

    def transform_hsa15(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform HSA15 (New Dwelling Completions) records.

        Args:
            records: Raw records from CSO

        Returns:
            Transformed records for database
        """
        transformed = []

        for record in records:
            period = record.get("Quarter") or record.get("Year") or record.get("TLIST(Q1)")
            region = record.get("County") or record.get("Region") or record.get("Area")
            value = record.get("value") or record.get("Value")

            if not period or value is None:
                continue

            period_date = self._parse_period(period)

            transformed.append({
                "table_id": "HSA15",
                "table_name": "New Dwelling Completions",
                "period": period,
                "period_date": period_date,
                "region": region or "State",
                "metric": "Dwelling Completions",
                "value": float(value) if value else None,
                "unit": "Number",
                "source_url": f"{self.config.base_url}{self.config.tables['HSA15']}",
            })

        return transformed

    def transform_bha02(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform BHA02 (Mortgage Drawdowns) records.

        Args:
            records: Raw records from CSO

        Returns:
            Transformed records for database
        """
        transformed = []

        for record in records:
            period = record.get("Quarter") or record.get("Month") or record.get("TLIST(Q1)")
            region = record.get("County") or record.get("Region")
            value = record.get("value") or record.get("Value")
            metric = record.get("Statistic") or record.get("Type") or "Mortgage Drawdowns"

            if not period or value is None:
                continue

            period_date = self._parse_period(period)

            transformed.append({
                "table_id": "BHA02",
                "table_name": "Mortgage Drawdowns",
                "period": period,
                "period_date": period_date,
                "region": region or "State",
                "metric": metric,
                "value": float(value) if value else None,
                "unit": "Number/EUR",
                "source_url": f"{self.config.base_url}{self.config.tables['BHA02']}",
            })

        return transformed

    def _parse_period(self, period: str) -> Optional[str]:
        """
        Parse CSO period string to date.

        Args:
            period: Period string (e.g., "2024M01", "2024Q1", "2024")

        Returns:
            ISO date string or None
        """
        if not period:
            return None

        period = str(period).strip()

        # Monthly: 2024M01, 2024-01
        month_match = re.match(r"(\d{4})[\-M]?(\d{2})", period)
        if month_match:
            year, month = month_match.groups()
            return f"{year}-{month}-01"

        # Quarterly: 2024Q1, 2024 Q1
        quarter_match = re.match(r"(\d{4})\s*Q(\d)", period)
        if quarter_match:
            year, quarter = quarter_match.groups()
            month = (int(quarter) - 1) * 3 + 1
            return f"{year}-{month:02d}-01"

        # Yearly: 2024
        year_match = re.match(r"^(\d{4})$", period)
        if year_match:
            return f"{year_match.group(1)}-01-01"

        return None

    def import_table(self, table_id: str) -> UpsertResult:
        """
        Import a single CSO table.

        Args:
            table_id: CSO table identifier

        Returns:
            UpsertResult with import statistics
        """
        logger.info(f"Importing {table_id}...")

        # Fetch data
        records = self.fetch_table(table_id)

        if not records:
            logger.warning(f"No records fetched for {table_id}")
            return UpsertResult(inserted=0, updated=0, failed=0, errors=[])

        # Transform based on table type
        if table_id == "HPM09":
            transformed = self.transform_hpm09(records)
        elif table_id == "HSA15":
            transformed = self.transform_hsa15(records)
        elif table_id == "BHA02":
            transformed = self.transform_bha02(records)
        else:
            logger.warning(f"No transformer for {table_id}")
            return UpsertResult(inserted=0, updated=0, failed=0, errors=[])

        logger.info(f"Transformed {len(transformed)} records for {table_id}")

        # Upsert to database
        result = self.db.upsert_records(
            table="cso_indicators",
            records=transformed,
            on_conflict="table_id,period,region,metric",
        )

        logger.info(f"{table_id}: {result.inserted} records upserted")
        return result

    def import_all(self) -> Dict[str, UpsertResult]:
        """
        Import all configured CSO tables.

        Returns:
            Dict of table_id -> UpsertResult
        """
        logger.start()

        results = {}
        total_imported = 0

        for table_id in self.config.tables:
            try:
                result = self.import_table(table_id)
                results[table_id] = result
                total_imported += result.inserted
            except Exception as e:
                logger.error(f"Failed to import {table_id}: {e}")
                results[table_id] = UpsertResult(
                    inserted=0, updated=0, failed=0, errors=[str(e)]
                )

        logger.complete({
            "Tables processed": len(self.config.tables),
            "Total records": total_imported,
        })

        return results


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Import CSO housing data")
    parser.add_argument(
        "--table",
        "-t",
        help="Specific table to import (HPM09, HSA15, BHA02)",
    )

    args = parser.parse_args()

    from utils.logger import setup_logging
    setup_logging("INFO")

    importer = CSOImporter()

    if args.table:
        result = importer.import_table(args.table.upper())
        print(f"\nImport complete: {result.inserted} records")
    else:
        results = importer.import_all()
        total = sum(r.inserted for r in results.values())
        print(f"\nImport complete: {total} total records across {len(results)} tables")


if __name__ == "__main__":
    main()
