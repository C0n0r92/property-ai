"""
Supabase Client Wrapper

Provides a higher-level interface for Supabase operations
with batching, retries, and error handling.
"""

import time
from typing import Any, Dict, List, Optional, TypeVar
from dataclasses import dataclass
from tenacity import retry, stop_after_attempt, wait_exponential

from supabase import create_client, Client

from config import get_config


T = TypeVar("T")


@dataclass
class UpsertResult:
    """Result of an upsert operation."""
    inserted: int
    updated: int
    failed: int
    errors: List[str]


class SupabaseClient:
    """
    High-level Supabase client with batching and error handling.
    """

    def __init__(self, batch_size: int = 100):
        config = get_config()
        self.client: Client = create_client(
            config.supabase.url,
            config.supabase.service_key,
        )
        self.batch_size = batch_size

    def _batch_data(self, data: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """Split data into batches."""
        return [
            data[i : i + self.batch_size]
            for i in range(0, len(data), self.batch_size)
        ]

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
    )
    def _upsert_batch(
        self,
        table: str,
        batch: List[Dict[str, Any]],
        on_conflict: str,
    ) -> bool:
        """Upsert a single batch with retry logic."""
        response = self.client.table(table).upsert(
            batch,
            on_conflict=on_conflict,
        ).execute()

        # Check for errors
        if hasattr(response, "error") and response.error:
            raise Exception(f"Supabase error: {response.error}")

        return True

    def upsert_records(
        self,
        table: str,
        records: List[Dict[str, Any]],
        on_conflict: str = "id",
        progress_callback: Optional[callable] = None,
    ) -> UpsertResult:
        """
        Upsert records to a table with batching.

        Args:
            table: Table name
            records: List of records to upsert
            on_conflict: Column(s) to use for conflict resolution
            progress_callback: Optional callback(processed, total) for progress

        Returns:
            UpsertResult with counts and any errors
        """
        if not records:
            return UpsertResult(inserted=0, updated=0, failed=0, errors=[])

        batches = self._batch_data(records)
        total = len(records)
        processed = 0
        failed = 0
        errors: List[str] = []

        for batch_num, batch in enumerate(batches, 1):
            try:
                self._upsert_batch(table, batch, on_conflict)
                processed += len(batch)
            except Exception as e:
                failed += len(batch)
                errors.append(f"Batch {batch_num}: {str(e)}")
                print(f"  ❌ Batch {batch_num} failed: {e}")

            if progress_callback:
                progress_callback(processed + failed, total)

        return UpsertResult(
            inserted=processed,  # Can't distinguish insert vs update with upsert
            updated=0,
            failed=failed,
            errors=errors,
        )

    def fetch_records(
        self,
        table: str,
        columns: str = "*",
        filters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Fetch records from a table.

        Args:
            table: Table name
            columns: Columns to select (comma-separated)
            filters: Dict of column -> value filters
            limit: Max records to return
            offset: Records to skip

        Returns:
            List of records
        """
        query = self.client.table(table).select(columns)

        if filters:
            for col, val in filters.items():
                query = query.eq(col, val)

        if limit:
            query = query.limit(limit)

        if offset:
            query = query.offset(offset)

        response = query.execute()
        return response.data or []

    def fetch_all_paginated(
        self,
        table: str,
        columns: str = "*",
        filters: Optional[Dict[str, Any]] = None,
        page_size: int = 1000,
    ) -> List[Dict[str, Any]]:
        """
        Fetch all records from a table with pagination.

        Args:
            table: Table name
            columns: Columns to select
            filters: Optional filters
            page_size: Records per page

        Returns:
            List of all records
        """
        all_records = []
        offset = 0

        while True:
            records = self.fetch_records(
                table=table,
                columns=columns,
                filters=filters,
                limit=page_size,
                offset=offset,
            )

            if not records:
                break

            all_records.extend(records)
            offset += len(records)

            if len(records) < page_size:
                break

        return all_records

    def delete_records(
        self,
        table: str,
        filters: Dict[str, Any],
    ) -> int:
        """
        Delete records matching filters.

        Args:
            table: Table name
            filters: Dict of column -> value filters

        Returns:
            Number of records deleted
        """
        query = self.client.table(table).delete()

        for col, val in filters.items():
            query = query.eq(col, val)

        response = query.execute()
        return len(response.data) if response.data else 0

    def count_records(
        self,
        table: str,
        filters: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        Count records in a table.

        Args:
            table: Table name
            filters: Optional filters

        Returns:
            Record count
        """
        query = self.client.table(table).select("*", count="exact")

        if filters:
            for col, val in filters.items():
                query = query.eq(col, val)

        response = query.limit(1).execute()
        return response.count or 0

    def execute_rpc(
        self,
        function_name: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """
        Execute a Supabase RPC function.

        Args:
            function_name: Name of the function
            params: Function parameters

        Returns:
            Function result
        """
        response = self.client.rpc(function_name, params or {}).execute()
        return response.data

    def test_connection(self) -> bool:
        """Test the database connection."""
        try:
            self.client.table("sold_properties").select("count", count="exact").limit(1).execute()
            return True
        except Exception:
            return False
