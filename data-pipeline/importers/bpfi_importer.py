"""
BPFI (Banking & Payments Federation Ireland) Mortgage Data Importer

Scrapes mortgage statistics from BPFI publications page.
Downloads Excel files, parses mortgage approval and drawdown data.

Data source: https://www.bpfi.ie/research-publications/

Tables imported:
- Mortgage approvals by county and buyer type
- Mortgage drawdowns by county and buyer type
"""

import io
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup

from config import get_config, BPFIConfig
from utils.supabase_client import SupabaseClient, UpsertResult
from utils.logger import PipelineLogger

logger = PipelineLogger(__name__, "BPFI Importer")


class BPFIImporter:
    """
    Imports BPFI mortgage statistics.
    """

    def __init__(self, config: Optional[BPFIConfig] = None):
        self.config = config or get_config().bpfi
        self.db = SupabaseClient(batch_size=100)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })

    def find_latest_mortgage_report(self) -> Optional[str]:
        """
        Find the URL of the latest mortgage market profile Excel file.

        Returns:
            URL of the latest Excel file, or None
        """
        logger.info(f"Searching for mortgage reports at {self.config.publications_url}")

        response = self.session.get(self.config.publications_url, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Find links to Excel files matching the pattern
        excel_links = []
        for link in soup.find_all("a", href=True):
            href = link["href"]
            text = link.get_text().lower()

            # Look for mortgage market profile files
            if self.config.file_pattern.lower() in href.lower() or \
               self.config.file_pattern.lower() in text:
                if href.endswith((".xlsx", ".xls")):
                    full_url = urljoin(self.config.publications_url, href)
                    excel_links.append(full_url)
                    logger.debug(f"Found: {full_url}")

        if not excel_links:
            # Try alternative approach - look for any recent mortgage Excel
            for link in soup.find_all("a", href=True):
                href = link["href"]
                if "mortgage" in href.lower() and href.endswith((".xlsx", ".xls")):
                    full_url = urljoin(self.config.publications_url, href)
                    excel_links.append(full_url)

        if excel_links:
            # Return the first (most recent) match
            logger.info(f"Found {len(excel_links)} mortgage reports")
            return excel_links[0]

        logger.warning("No mortgage reports found")
        return None

    def download_excel(self, url: str) -> bytes:
        """
        Download Excel file from URL.

        Args:
            url: URL of Excel file

        Returns:
            File content as bytes
        """
        logger.info(f"Downloading {url}")
        response = self.session.get(url, timeout=60)
        response.raise_for_status()
        return response.content

    def parse_mortgage_excel(
        self, content: bytes, url: str
    ) -> List[Dict[str, Any]]:
        """
        Parse BPFI mortgage Excel file.

        Args:
            content: Excel file content
            url: Source URL for reference

        Returns:
            List of parsed records
        """
        logger.info("Parsing mortgage Excel file")
        records = []

        try:
            # Read Excel with pandas
            xl = pd.ExcelFile(io.BytesIO(content))

            # Process each sheet
            for sheet_name in xl.sheet_names:
                sheet_records = self._parse_sheet(xl, sheet_name, url)
                records.extend(sheet_records)

        except Exception as e:
            logger.error(f"Failed to parse Excel: {e}")

        logger.info(f"Parsed {len(records)} records from Excel")
        return records

    def _parse_sheet(
        self,
        xl: pd.ExcelFile,
        sheet_name: str,
        source_url: str,
    ) -> List[Dict[str, Any]]:
        """
        Parse a single Excel sheet.

        Args:
            xl: ExcelFile object
            sheet_name: Name of sheet to parse
            source_url: Source URL

        Returns:
            List of records from this sheet
        """
        records = []

        try:
            df = xl.parse(sheet_name)

            # Skip empty sheets
            if df.empty:
                return records

            # Determine what type of data this sheet contains
            sheet_lower = sheet_name.lower()

            if "approval" in sheet_lower or "approved" in sheet_lower:
                records = self._parse_approvals_sheet(df, source_url)
            elif "drawdown" in sheet_lower:
                records = self._parse_drawdowns_sheet(df, source_url)
            elif "county" in sheet_lower:
                records = self._parse_county_sheet(df, source_url)
            else:
                # Try to auto-detect
                records = self._parse_generic_sheet(df, sheet_name, source_url)

        except Exception as e:
            logger.debug(f"Could not parse sheet '{sheet_name}': {e}")

        return records

    def _parse_approvals_sheet(
        self,
        df: pd.DataFrame,
        source_url: str,
    ) -> List[Dict[str, Any]]:
        """Parse mortgage approvals data."""
        records = []

        # Try to identify period column and data columns
        for col in df.columns:
            col_str = str(col).lower()
            if any(month in col_str for month in ["jan", "feb", "mar", "apr", "may", "jun",
                                                   "jul", "aug", "sep", "oct", "nov", "dec"]):
                # This looks like a period column
                period = self._extract_period(str(col))
                if period:
                    for idx, row in df.iterrows():
                        county = str(row.iloc[0]) if pd.notna(row.iloc[0]) else None
                        if county and county.lower() not in ["total", "nan", "", "county"]:
                            value = row[col]
                            if pd.notna(value):
                                records.append(self._create_record(
                                    period=period,
                                    county=self._normalize_county(county),
                                    buyer_type="All",
                                    approvals_count=int(value) if isinstance(value, (int, float)) else None,
                                    source_url=source_url,
                                ))

        return records

    def _parse_drawdowns_sheet(
        self,
        df: pd.DataFrame,
        source_url: str,
    ) -> List[Dict[str, Any]]:
        """Parse mortgage drawdowns data."""
        records = []

        # Similar logic to approvals
        for col in df.columns:
            col_str = str(col).lower()
            period = self._extract_period(col_str)
            if period:
                for idx, row in df.iterrows():
                    county = str(row.iloc[0]) if pd.notna(row.iloc[0]) else None
                    if county and county.lower() not in ["total", "nan", "", "county"]:
                        value = row[col]
                        if pd.notna(value):
                            records.append(self._create_record(
                                period=period,
                                county=self._normalize_county(county),
                                buyer_type="All",
                                drawdowns_count=int(value) if isinstance(value, (int, float)) else None,
                                source_url=source_url,
                            ))

        return records

    def _parse_county_sheet(
        self,
        df: pd.DataFrame,
        source_url: str,
    ) -> List[Dict[str, Any]]:
        """Parse county-level mortgage data."""
        records = []

        # Look for Dublin specifically
        dublin_rows = df[df.apply(
            lambda row: any("dublin" in str(v).lower() for v in row if pd.notna(v)),
            axis=1
        )]

        for _, row in dublin_rows.iterrows():
            # Extract values from row
            for col in df.columns:
                period = self._extract_period(str(col))
                if period:
                    value = row[col]
                    if pd.notna(value) and isinstance(value, (int, float)):
                        records.append(self._create_record(
                            period=period,
                            county="Dublin",
                            buyer_type="All",
                            approvals_count=int(value),
                            source_url=source_url,
                        ))

        return records

    def _parse_generic_sheet(
        self,
        df: pd.DataFrame,
        sheet_name: str,
        source_url: str,
    ) -> List[Dict[str, Any]]:
        """Generic parser for unrecognized sheet formats."""
        records = []

        # Try to extract any Dublin-related data with periods
        for _, row in df.iterrows():
            row_text = " ".join(str(v) for v in row if pd.notna(v))

            if "dublin" in row_text.lower():
                for col in df.columns:
                    period = self._extract_period(str(col))
                    if period:
                        value = row[col]
                        if pd.notna(value) and isinstance(value, (int, float)):
                            records.append(self._create_record(
                                period=period,
                                county="Dublin",
                                buyer_type="All",
                                approvals_count=int(value) if "approval" in sheet_name.lower() else None,
                                drawdowns_count=int(value) if "drawdown" in sheet_name.lower() else None,
                                source_url=source_url,
                            ))

        return records

    def _extract_period(self, text: str) -> Optional[str]:
        """Extract period from column header or text."""
        text = str(text).lower()

        # Month patterns: jan-2024, jan 2024, january 2024
        months = {
            "jan": "01", "feb": "02", "mar": "03", "apr": "04",
            "may": "05", "jun": "06", "jul": "07", "aug": "08",
            "sep": "09", "oct": "10", "nov": "11", "dec": "12"
        }

        for month_abbr, month_num in months.items():
            if month_abbr in text:
                # Find year
                year_match = re.search(r"20\d{2}", text)
                if year_match:
                    return f"{year_match.group()}-{month_num}"

        # Quarter patterns: Q1 2024, 2024 Q1
        quarter_match = re.search(r"q(\d)[^\d]*20(\d{2})", text)
        if quarter_match:
            q, year = quarter_match.groups()
            month = str((int(q) - 1) * 3 + 1).zfill(2)
            return f"20{year}-{month}"

        return None

    def _normalize_county(self, county: str) -> str:
        """Normalize county name."""
        county = str(county).strip()

        if "dublin" in county.lower():
            return "Dublin"

        return county.title()

    def _create_record(
        self,
        period: str,
        county: str,
        buyer_type: str,
        approvals_count: Optional[int] = None,
        approvals_value_eur: Optional[int] = None,
        drawdowns_count: Optional[int] = None,
        drawdowns_value_eur: Optional[int] = None,
        source_url: str = "",
    ) -> Dict[str, Any]:
        """Create a database record."""
        # Parse period to date
        period_date = None
        if period:
            try:
                if len(period) == 7:  # YYYY-MM
                    period_date = f"{period}-01"
            except Exception:
                pass

        return {
            "period": period,
            "period_date": period_date,
            "county": county,
            "buyer_type": buyer_type,
            "approvals_count": approvals_count,
            "approvals_value_eur": approvals_value_eur,
            "drawdowns_count": drawdowns_count,
            "drawdowns_value_eur": drawdowns_value_eur,
            "source_url": source_url,
        }

    def import_latest(self) -> UpsertResult:
        """
        Import the latest BPFI mortgage data.

        Returns:
            UpsertResult with import statistics
        """
        logger.start()

        # Find latest report
        url = self.find_latest_mortgage_report()
        if not url:
            logger.error("Could not find mortgage report")
            return UpsertResult(inserted=0, updated=0, failed=0, errors=["No report found"])

        # Download and parse
        try:
            content = self.download_excel(url)
            records = self.parse_mortgage_excel(content, url)
        except Exception as e:
            logger.error(f"Failed to download/parse: {e}")
            return UpsertResult(inserted=0, updated=0, failed=0, errors=[str(e)])

        if not records:
            logger.warning("No records parsed from Excel")
            return UpsertResult(inserted=0, updated=0, failed=0, errors=["No records parsed"])

        # Filter to valid records
        valid_records = [
            r for r in records
            if r.get("period") and (r.get("approvals_count") or r.get("drawdowns_count"))
        ]

        logger.info(f"Upserting {len(valid_records)} valid records")

        # Upsert to database
        result = self.db.upsert_records(
            table="bpfi_mortgages",
            records=valid_records,
            on_conflict="period,county,buyer_type",
        )

        logger.complete({
            "Records parsed": len(records),
            "Valid records": len(valid_records),
            "Inserted/Updated": result.inserted,
            "Failed": result.failed,
        })

        return result

    def import_from_file(self, file_path: str) -> UpsertResult:
        """
        Import from a local Excel file.

        Args:
            file_path: Path to Excel file

        Returns:
            UpsertResult
        """
        logger.start(f"file: {file_path}")

        with open(file_path, "rb") as f:
            content = f.read()

        records = self.parse_mortgage_excel(content, f"file://{file_path}")

        valid_records = [
            r for r in records
            if r.get("period") and (r.get("approvals_count") or r.get("drawdowns_count"))
        ]

        result = self.db.upsert_records(
            table="bpfi_mortgages",
            records=valid_records,
            on_conflict="period,county,buyer_type",
        )

        logger.complete({
            "Records": len(valid_records),
            "Inserted": result.inserted,
        })

        return result


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Import BPFI mortgage data")
    parser.add_argument(
        "--file",
        "-f",
        help="Path to local Excel file (instead of downloading)",
    )

    args = parser.parse_args()

    from utils.logger import setup_logging
    setup_logging("INFO")

    importer = BPFIImporter()

    if args.file:
        result = importer.import_from_file(args.file)
    else:
        result = importer.import_latest()

    print(f"\nImport complete: {result.inserted} records")


if __name__ == "__main__":
    main()
