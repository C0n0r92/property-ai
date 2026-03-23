"""
BER Certificate Matcher

Matches BER certificates to properties and listings.
Updates property records with BER data.
"""

from typing import Any, Dict, List, Optional, Tuple

from utils.supabase_client import SupabaseClient, UpsertResult
from utils.logger import PipelineLogger
from .address_matcher import AddressMatcher

logger = PipelineLogger(__name__, "BER Matcher")


class BERMatcher:
    """
    Matches BER certificates to sold properties and listings.
    """

    def __init__(self, match_threshold: int = 75):
        """
        Initialize BER matcher.

        Args:
            match_threshold: Minimum match score (0-100)
        """
        self.db = SupabaseClient(batch_size=100)
        self.address_matcher = AddressMatcher(match_threshold=match_threshold)
        self.match_threshold = match_threshold

    def fetch_unmatched_ber_certificates(
        self,
        county: str = "Dublin",
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """
        Fetch BER certificates that haven't been matched.

        Args:
            county: Filter by county
            limit: Maximum records to fetch

        Returns:
            List of unmatched BER certificates
        """
        return self.db.fetch_records(
            table="ber_certificates",
            columns="id,ber_number,address,eircode,ber_rating,ber_energy_value,floor_area_sqm",
            filters={"county": county, "matched_property_id": None},
            limit=limit,
        )

    def fetch_properties(
        self,
        limit: int = 5000,
    ) -> List[Dict[str, Any]]:
        """
        Fetch sold properties to match against.

        Args:
            limit: Maximum records to fetch

        Returns:
            List of properties
        """
        return self.db.fetch_all_paginated(
            table="sold_properties",
            columns="id,address,eircode,latitude,longitude",
            page_size=1000,
        )

    def fetch_listings(
        self,
        limit: int = 5000,
    ) -> List[Dict[str, Any]]:
        """
        Fetch active listings to match against.

        Args:
            limit: Maximum records to fetch

        Returns:
            List of listings
        """
        return self.db.fetch_all_paginated(
            table="property_listings",
            columns="id,address,eircode,latitude,longitude",
            page_size=1000,
        )

    def match_ber_to_properties(
        self,
        ber_records: Optional[List[Dict[str, Any]]] = None,
        properties: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, int]:
        """
        Match BER certificates to sold properties.

        Args:
            ber_records: BER certificates to match (fetched if not provided)
            properties: Properties to match against (fetched if not provided)

        Returns:
            Dict with match statistics
        """
        logger.start()

        # Fetch data if not provided
        if ber_records is None:
            ber_records = self.fetch_unmatched_ber_certificates()

        if properties is None:
            properties = self.fetch_properties()

        if not ber_records or not properties:
            logger.warning("No records to match")
            return {"matched": 0, "unmatched": 0}

        logger.info(f"Matching {len(ber_records)} BER certs to {len(properties)} properties")

        # Perform matching
        matches = self.address_matcher.batch_match(
            records=ber_records,
            candidates=properties,
            source_address_field="address",
            target_address_field="address",
            eircode_field="eircode",
        )

        # Process matches
        matched = 0
        unmatched = 0
        updates_ber = []
        updates_property = []

        for ber, prop, score, match_type in matches:
            if prop and score >= self.match_threshold:
                matched += 1

                # Update BER record with property ID
                updates_ber.append({
                    "id": ber["id"],
                    "matched_property_id": prop["id"],
                    "match_confidence": score / 100,
                })

                # Update property with BER data
                updates_property.append({
                    "id": prop["id"],
                    "matched_ber_id": ber["id"],
                    "ber_rating": ber.get("ber_rating"),
                    "ber_energy_value": ber.get("ber_energy_value"),
                })
            else:
                unmatched += 1

        # Apply updates
        if updates_ber:
            logger.info(f"Updating {len(updates_ber)} BER certificates...")
            for update in updates_ber:
                self.db.client.table("ber_certificates").update(
                    {"matched_property_id": update["matched_property_id"],
                     "match_confidence": update["match_confidence"]}
                ).eq("id", update["id"]).execute()

        if updates_property:
            logger.info(f"Updating {len(updates_property)} properties with BER data...")
            for update in updates_property:
                self.db.client.table("sold_properties").update({
                    "matched_ber_id": update["matched_ber_id"],
                    "ber_rating": update["ber_rating"],
                    "ber_energy_value": update["ber_energy_value"],
                }).eq("id", update["id"]).execute()

        stats = {
            "matched": matched,
            "unmatched": unmatched,
            "match_rate": f"{matched / len(ber_records) * 100:.1f}%" if ber_records else "0%",
        }

        logger.complete(stats)
        return stats

    def match_ber_to_listings(
        self,
        ber_records: Optional[List[Dict[str, Any]]] = None,
        listings: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, int]:
        """
        Match BER certificates to active listings.

        Args:
            ber_records: BER certificates to match
            listings: Listings to match against

        Returns:
            Dict with match statistics
        """
        logger.info("Matching BER certificates to listings...")

        if ber_records is None:
            ber_records = self.fetch_unmatched_ber_certificates()

        if listings is None:
            listings = self.fetch_listings()

        if not ber_records or not listings:
            logger.warning("No records to match")
            return {"matched": 0, "unmatched": 0}

        logger.info(f"Matching {len(ber_records)} BER certs to {len(listings)} listings")

        # Perform matching
        matches = self.address_matcher.batch_match(
            records=ber_records,
            candidates=listings,
            source_address_field="address",
            target_address_field="address",
            eircode_field="eircode",
        )

        matched = 0
        unmatched = 0

        for ber, listing, score, match_type in matches:
            if listing and score >= self.match_threshold:
                matched += 1

                # Update BER record
                self.db.client.table("ber_certificates").update({
                    "matched_listing_id": listing["id"],
                    "match_confidence": score / 100,
                }).eq("id", ber["id"]).execute()

                # Update listing with BER data (if not already set)
                self.db.client.table("property_listings").update({
                    "matched_ber_id": ber["id"],
                    "ber_rating": ber.get("ber_rating"),
                }).eq("id", listing["id"]).is_("ber_rating", "null").execute()
            else:
                unmatched += 1

        return {
            "matched": matched,
            "unmatched": unmatched,
        }

    def run_all_matching(self) -> Dict[str, Dict[str, int]]:
        """
        Run matching against both properties and listings.

        Returns:
            Dict with results for each match type
        """
        logger.start()

        # Fetch BER records once
        ber_records = self.fetch_unmatched_ber_certificates(limit=10000)

        results = {}

        # Match to properties
        results["properties"] = self.match_ber_to_properties(ber_records=ber_records)

        # Match remaining to listings
        remaining_ber = [
            r for r in ber_records
            if r["id"] not in [u["id"] for u in results.get("properties", {}).get("updates_ber", [])]
        ]

        results["listings"] = self.match_ber_to_listings(ber_records=remaining_ber)

        total_matched = results["properties"]["matched"] + results["listings"]["matched"]
        total_unmatched = results["properties"]["unmatched"] + results["listings"]["unmatched"]

        logger.complete({
            "Total matched": total_matched,
            "Total unmatched": total_unmatched,
            "Property matches": results["properties"]["matched"],
            "Listing matches": results["listings"]["matched"],
        })

        return results


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Match BER certificates to properties")
    parser.add_argument(
        "--target",
        "-t",
        choices=["properties", "listings", "all"],
        default="all",
        help="What to match against",
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=75,
        help="Minimum match score (0-100)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=1000,
        help="Max BER records to process",
    )

    args = parser.parse_args()

    from utils.logger import setup_logging
    setup_logging("INFO")

    matcher = BERMatcher(match_threshold=args.threshold)

    if args.target == "all":
        results = matcher.run_all_matching()
        total = sum(r.get("matched", 0) for r in results.values())
        print(f"\nMatching complete: {total} total matches")
    elif args.target == "properties":
        result = matcher.match_ber_to_properties()
        print(f"\nMatching complete: {result['matched']} property matches")
    else:
        result = matcher.match_ber_to_listings()
        print(f"\nMatching complete: {result['matched']} listing matches")


if __name__ == "__main__":
    main()
