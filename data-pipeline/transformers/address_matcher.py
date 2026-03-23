"""
Address Matching Utilities

Provides fuzzy address matching between different datasets.
Uses various matching strategies for Irish addresses.
"""

import re
from typing import Any, Dict, List, Optional, Tuple

from fuzzywuzzy import fuzz, process

from utils.logger import get_logger

logger = get_logger(__name__)


class AddressMatcher:
    """
    Fuzzy address matching for Irish property addresses.
    """

    # Common Dublin area abbreviations
    AREA_ALIASES = {
        "d1": "dublin 1",
        "d2": "dublin 2",
        "d3": "dublin 3",
        "d4": "dublin 4",
        "d5": "dublin 5",
        "d6": "dublin 6",
        "d6w": "dublin 6w",
        "d7": "dublin 7",
        "d8": "dublin 8",
        "d9": "dublin 9",
        "d10": "dublin 10",
        "d11": "dublin 11",
        "d12": "dublin 12",
        "d13": "dublin 13",
        "d14": "dublin 14",
        "d15": "dublin 15",
        "d16": "dublin 16",
        "d17": "dublin 17",
        "d18": "dublin 18",
        "d20": "dublin 20",
        "d22": "dublin 22",
        "d24": "dublin 24",
        "dlr": "dun laoghaire rathdown",
        "dun laoghaire-rathdown": "dun laoghaire rathdown",
    }

    # Words to remove during normalization
    STOPWORDS = {
        "apartment", "apt", "flat", "unit", "floor", "block",
        "the", "and", "at", "of", "in",
        "county", "co", "ireland",
    }

    # Number patterns to normalize
    NUMBER_WORDS = {
        "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
        "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    }

    def __init__(self, match_threshold: int = 80):
        """
        Initialize matcher.

        Args:
            match_threshold: Minimum fuzzy match score (0-100)
        """
        self.match_threshold = match_threshold

    def normalize_address(self, address: str) -> str:
        """
        Normalize an address for comparison.

        Args:
            address: Raw address string

        Returns:
            Normalized address
        """
        if not address:
            return ""

        # Lowercase
        addr = address.lower().strip()

        # Replace punctuation with spaces
        addr = re.sub(r"[,./\-–—]", " ", addr)

        # Expand area aliases
        for alias, full in self.AREA_ALIASES.items():
            addr = re.sub(rf"\b{alias}\b", full, addr)

        # Convert number words
        for word, digit in self.NUMBER_WORDS.items():
            addr = re.sub(rf"\b{word}\b", digit, addr)

        # Remove stopwords
        words = addr.split()
        words = [w for w in words if w not in self.STOPWORDS]
        addr = " ".join(words)

        # Normalize whitespace
        addr = re.sub(r"\s+", " ", addr).strip()

        return addr

    def extract_house_number(self, address: str) -> Optional[str]:
        """
        Extract house/apartment number from address.

        Args:
            address: Address string

        Returns:
            House number or None
        """
        # Match patterns like "12", "12A", "Apt 5", etc.
        patterns = [
            r"^(\d+[a-z]?)\s",           # Number at start
            r"apt\.?\s*(\d+)",            # Apartment number
            r"flat\s*(\d+)",              # Flat number
            r"unit\s*(\d+)",              # Unit number
            r"#(\d+)",                    # Hash prefix
        ]

        addr_lower = address.lower()
        for pattern in patterns:
            match = re.search(pattern, addr_lower)
            if match:
                return match.group(1)

        return None

    def extract_eircode(self, address: str) -> Optional[str]:
        """
        Extract eircode from address.

        Args:
            address: Address string

        Returns:
            Eircode or None
        """
        # Eircode pattern: A65 F4E2, D01 P2X0, etc.
        pattern = r"[A-Z]\d{2}\s?[A-Z0-9]{4}"
        match = re.search(pattern, address.upper())
        return match.group(0).replace(" ", " ") if match else None

    def extract_street(self, address: str) -> str:
        """
        Extract street name from address.

        Args:
            address: Address string

        Returns:
            Street name portion
        """
        # Remove house numbers from start
        addr = re.sub(r"^\d+[a-z]?\s+", "", address.lower())

        # Remove eircode
        addr = re.sub(r"[a-z]\d{2}\s?[a-z0-9]{4}", "", addr, flags=re.I)

        # Remove Dublin postcode
        addr = re.sub(r",?\s*dublin\s*\d+\w?", "", addr, flags=re.I)

        # Remove county
        addr = re.sub(r",?\s*co\.?\s*dublin", "", addr, flags=re.I)

        # Clean up
        addr = re.sub(r"[,]+", " ", addr)
        addr = re.sub(r"\s+", " ", addr).strip()

        return addr

    def calculate_match_score(
        self,
        addr1: str,
        addr2: str,
        use_eircode: bool = True,
    ) -> Tuple[int, str]:
        """
        Calculate match score between two addresses.

        Args:
            addr1: First address
            addr2: Second address
            use_eircode: Whether to use eircode matching

        Returns:
            Tuple of (score, match_type)
        """
        # Check eircode match first (highest confidence)
        if use_eircode:
            eircode1 = self.extract_eircode(addr1)
            eircode2 = self.extract_eircode(addr2)

            if eircode1 and eircode2:
                if eircode1 == eircode2:
                    return (100, "eircode_exact")
                # Partial eircode match (same routing key)
                if eircode1[:3] == eircode2[:3]:
                    # Still need address similarity
                    pass

        # Normalize addresses
        norm1 = self.normalize_address(addr1)
        norm2 = self.normalize_address(addr2)

        if not norm1 or not norm2:
            return (0, "no_match")

        # Exact match after normalization
        if norm1 == norm2:
            return (100, "exact_normalized")

        # Extract components
        num1 = self.extract_house_number(addr1)
        num2 = self.extract_house_number(addr2)

        street1 = self.extract_street(addr1)
        street2 = self.extract_street(addr2)

        # If house numbers match, use street similarity
        if num1 and num2 and num1 == num2:
            street_score = fuzz.ratio(
                self.normalize_address(street1),
                self.normalize_address(street2),
            )
            return (street_score, "number_match")

        # Full fuzzy comparison
        token_sort = fuzz.token_sort_ratio(norm1, norm2)
        token_set = fuzz.token_set_ratio(norm1, norm2)
        partial = fuzz.partial_ratio(norm1, norm2)

        # Weighted average
        score = int(
            token_sort * 0.4 +
            token_set * 0.4 +
            partial * 0.2
        )

        return (score, "fuzzy")

    def find_best_match(
        self,
        address: str,
        candidates: List[Dict[str, Any]],
        address_field: str = "address",
        eircode_field: Optional[str] = "eircode",
    ) -> Optional[Tuple[Dict[str, Any], int, str]]:
        """
        Find best matching address from candidates.

        Args:
            address: Address to match
            candidates: List of candidate records
            address_field: Field name containing address
            eircode_field: Field name containing eircode (optional)

        Returns:
            Tuple of (matching_record, score, match_type) or None
        """
        if not address or not candidates:
            return None

        best_match = None
        best_score = 0
        best_type = "no_match"

        # First, try eircode matching
        input_eircode = self.extract_eircode(address)
        if input_eircode and eircode_field:
            for candidate in candidates:
                cand_eircode = candidate.get(eircode_field)
                if cand_eircode and cand_eircode.replace(" ", "") == input_eircode.replace(" ", ""):
                    # Eircode match - verify with address similarity
                    cand_addr = candidate.get(address_field, "")
                    score, match_type = self.calculate_match_score(
                        address, cand_addr, use_eircode=False
                    )

                    if score >= 50:  # Lower threshold for eircode matches
                        return (candidate, 100, "eircode_exact")

        # Fall back to fuzzy matching
        for candidate in candidates:
            cand_addr = candidate.get(address_field, "")
            if not cand_addr:
                continue

            score, match_type = self.calculate_match_score(address, cand_addr)

            if score > best_score:
                best_score = score
                best_match = candidate
                best_type = match_type

        if best_match and best_score >= self.match_threshold:
            return (best_match, best_score, best_type)

        return None

    def batch_match(
        self,
        records: List[Dict[str, Any]],
        candidates: List[Dict[str, Any]],
        source_address_field: str = "address",
        target_address_field: str = "address",
        eircode_field: Optional[str] = "eircode",
    ) -> List[Tuple[Dict[str, Any], Optional[Dict[str, Any]], int, str]]:
        """
        Match multiple records against candidates.

        Args:
            records: Records to match
            candidates: Pool of candidates to match against
            source_address_field: Address field in source records
            target_address_field: Address field in candidates
            eircode_field: Eircode field name

        Returns:
            List of (record, match, score, match_type) tuples
        """
        results = []

        # Build index for faster eircode lookup
        eircode_index: Dict[str, List[Dict[str, Any]]] = {}
        if eircode_field:
            for cand in candidates:
                eircode = cand.get(eircode_field)
                if eircode:
                    key = eircode.replace(" ", "").upper()
                    if key not in eircode_index:
                        eircode_index[key] = []
                    eircode_index[key].append(cand)

        for record in records:
            source_addr = record.get(source_address_field, "")

            # Try eircode index first
            source_eircode = self.extract_eircode(source_addr)
            if source_eircode:
                key = source_eircode.replace(" ", "").upper()
                if key in eircode_index:
                    # Found eircode match(es)
                    cands = eircode_index[key]
                    if len(cands) == 1:
                        results.append((record, cands[0], 100, "eircode_exact"))
                        continue
                    # Multiple matches - use address to disambiguate
                    result = self.find_best_match(
                        source_addr, cands, target_address_field, None
                    )
                    if result:
                        results.append((record, result[0], result[1], result[2]))
                        continue

            # Fall back to fuzzy matching
            result = self.find_best_match(
                source_addr, candidates, target_address_field, eircode_field
            )

            if result:
                results.append((record, result[0], result[1], result[2]))
            else:
                results.append((record, None, 0, "no_match"))

        return results
