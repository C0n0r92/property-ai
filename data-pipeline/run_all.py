#!/usr/bin/env python3
"""
Gaff Intel Data Pipeline Orchestrator

Runs all data importers in sequence with logging and error handling.
Designed to be called from shell scripts or cron jobs.

Usage:
    python run_all.py                    # Run all importers
    python run_all.py --daily            # Run daily importers only
    python run_all.py --weekly           # Run weekly importers only
    python run_all.py --monthly          # Run monthly importers only
    python run_all.py --importer cso     # Run specific importer
"""

import argparse
import sys
from datetime import datetime
from typing import Dict, List, Optional

from utils.logger import setup_logging, PipelineLogger

logger = PipelineLogger(__name__, "Data Pipeline Orchestrator")


# Define which importers run on each schedule
SCHEDULES = {
    "daily": [],  # Listings/history tracking handled by TypeScript scrapers
    "weekly": [
        "planning",  # Planning applications (via TypeScript)
        "abp",       # An Bord Pleanala (via TypeScript)
    ],
    "monthly": [
        "cso",       # CSO housing statistics
        "bpfi",      # BPFI mortgage data
        "ber",       # BER matching (data updated less frequently)
    ],
    "quarterly": [
        "gtfs",      # Transit data
        "flood",     # Flood zones
    ],
}


def run_cso_importer() -> Dict[str, int]:
    """Run CSO importer."""
    from importers.cso_importer import CSOImporter

    importer = CSOImporter()
    results = importer.import_all()

    total = sum(r.inserted for r in results.values())
    return {"imported": total, "tables": len(results)}


def run_bpfi_importer() -> Dict[str, int]:
    """Run BPFI importer."""
    from importers.bpfi_importer import BPFIImporter

    importer = BPFIImporter()
    result = importer.import_latest()

    return {"imported": result.inserted, "failed": result.failed}


def run_ber_importer(file_path: Optional[str] = None) -> Dict[str, int]:
    """Run BER importer and matcher."""
    from importers.ber_importer import BERImporter
    from transformers.ber_matcher import BERMatcher

    results = {"imported": 0, "matched": 0}

    # Import BER data if file provided
    if file_path:
        importer = BERImporter()
        result = importer.import_from_csv(file_path)
        results["imported"] = result.inserted

    # Run matching
    matcher = BERMatcher()
    match_results = matcher.run_all_matching()
    results["matched"] = sum(r.get("matched", 0) for r in match_results.values())

    return results


def run_gtfs_importer() -> Dict[str, int]:
    """Run GTFS transit importer."""
    from importers.gtfs_importer import GTFSImporter

    importer = GTFSImporter()
    result = importer.import_gtfs()

    return {"imported": result.inserted, "failed": result.failed}


def run_flood_importer() -> Dict[str, int]:
    """Run flood zones importer."""
    from importers.flood_importer import FloodImporter

    importer = FloodImporter()
    results = importer.import_all()

    total = sum(r.inserted for r in results.values())
    return {"imported": total, "layers": len(results)}


# Importer registry
IMPORTERS = {
    "cso": run_cso_importer,
    "bpfi": run_bpfi_importer,
    "ber": run_ber_importer,
    "gtfs": run_gtfs_importer,
    "flood": run_flood_importer,
}


def run_importers(
    importers: List[str],
    ber_file: Optional[str] = None,
) -> Dict[str, Dict[str, int]]:
    """
    Run specified importers.

    Args:
        importers: List of importer names to run
        ber_file: Optional BER CSV file path

    Returns:
        Dict of importer -> results
    """
    results = {}

    for name in importers:
        if name not in IMPORTERS:
            logger.warning(f"Unknown importer: {name}")
            continue

        logger.info(f"Running {name} importer...")
        start_time = datetime.now()

        try:
            if name == "ber":
                result = IMPORTERS[name](ber_file)
            else:
                result = IMPORTERS[name]()

            duration = (datetime.now() - start_time).total_seconds()
            result["duration_seconds"] = duration

            results[name] = result
            logger.info(f"  {name} complete: {result}")

        except Exception as e:
            logger.error(f"  {name} failed: {e}")
            results[name] = {"error": str(e)}

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Gaff Intel Data Pipeline Orchestrator"
    )

    # Schedule options
    schedule_group = parser.add_mutually_exclusive_group()
    schedule_group.add_argument(
        "--daily",
        action="store_true",
        help="Run daily importers",
    )
    schedule_group.add_argument(
        "--weekly",
        action="store_true",
        help="Run weekly importers",
    )
    schedule_group.add_argument(
        "--monthly",
        action="store_true",
        help="Run monthly importers",
    )
    schedule_group.add_argument(
        "--quarterly",
        action="store_true",
        help="Run quarterly importers",
    )
    schedule_group.add_argument(
        "--importer",
        "-i",
        choices=list(IMPORTERS.keys()),
        help="Run specific importer",
    )

    # Options
    parser.add_argument(
        "--ber-file",
        help="BER CSV file path (for BER importer)",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level",
    )
    parser.add_argument(
        "--log-file",
        help="Log file path",
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging(args.log_level, args.log_file)

    # Determine which importers to run
    if args.importer:
        importers_to_run = [args.importer]
    elif args.daily:
        importers_to_run = SCHEDULES["daily"]
    elif args.weekly:
        importers_to_run = SCHEDULES["weekly"]
    elif args.monthly:
        importers_to_run = SCHEDULES["monthly"]
    elif args.quarterly:
        importers_to_run = SCHEDULES["quarterly"]
    else:
        # Run all Python importers
        importers_to_run = list(IMPORTERS.keys())

    if not importers_to_run:
        logger.info("No importers to run for this schedule")
        return 0

    logger.start()
    logger.info(f"Importers to run: {', '.join(importers_to_run)}")

    # Run importers
    results = run_importers(importers_to_run, args.ber_file)

    # Summary
    success = sum(1 for r in results.values() if "error" not in r)
    failed = len(results) - success

    logger.complete({
        "Importers run": len(results),
        "Successful": success,
        "Failed": failed,
    })

    # Print detailed results
    print("\n" + "=" * 50)
    print("PIPELINE RESULTS")
    print("=" * 50)
    for name, result in results.items():
        status = "FAILED" if "error" in result else "OK"
        print(f"\n{name}: {status}")
        for key, value in result.items():
            print(f"  {key}: {value}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
