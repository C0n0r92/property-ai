"""
Logging Configuration

Provides structured logging for the data pipeline.
"""

import logging
import sys
from datetime import datetime
from typing import Optional


class ColorFormatter(logging.Formatter):
    """Formatter with colored output for terminal."""

    COLORS = {
        logging.DEBUG: "\033[36m",    # Cyan
        logging.INFO: "\033[32m",     # Green
        logging.WARNING: "\033[33m",  # Yellow
        logging.ERROR: "\033[31m",    # Red
        logging.CRITICAL: "\033[35m", # Magenta
    }
    RESET = "\033[0m"
    BOLD = "\033[1m"

    ICONS = {
        logging.DEBUG: "🔍",
        logging.INFO: "✅",
        logging.WARNING: "⚠️ ",
        logging.ERROR: "❌",
        logging.CRITICAL: "💥",
    }

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelno, "")
        icon = self.ICONS.get(record.levelno, "")
        reset = self.RESET

        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime("%H:%M:%S")

        # Format message
        formatted = f"{color}{icon} [{timestamp}] {record.getMessage()}{reset}"

        # Add exception info if present
        if record.exc_info:
            formatted += f"\n{self.formatException(record.exc_info)}"

        return formatted


class PlainFormatter(logging.Formatter):
    """Plain formatter for file output."""

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S")
        level = record.levelname.ljust(8)
        module = record.name

        formatted = f"[{timestamp}] {level} {module}: {record.getMessage()}"

        if record.exc_info:
            formatted += f"\n{self.formatException(record.exc_info)}"

        return formatted


def setup_logging(
    level: str = "INFO",
    log_file: Optional[str] = None,
) -> None:
    """
    Set up logging configuration.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional file path for log output
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Console handler with colors
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(ColorFormatter())
    root_logger.addHandler(console_handler)

    # File handler (optional)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(PlainFormatter())
        root_logger.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured logger
    """
    return logging.getLogger(name)


# Pipeline-specific logging utilities
class PipelineLogger:
    """
    Logger with pipeline-specific formatting.
    """

    def __init__(self, name: str, pipeline_name: str):
        self.logger = get_logger(name)
        self.pipeline_name = pipeline_name

    def start(self, message: str = "") -> None:
        """Log pipeline start."""
        header = f"{'=' * 50}"
        self.logger.info(header)
        self.logger.info(f"🚀 Starting {self.pipeline_name}")
        if message:
            self.logger.info(message)
        self.logger.info(header)

    def complete(self, stats: dict) -> None:
        """Log pipeline completion with stats."""
        self.logger.info(f"✅ {self.pipeline_name} complete")
        for key, value in stats.items():
            self.logger.info(f"   {key}: {value}")

    def error(self, message: str, exc: Optional[Exception] = None) -> None:
        """Log pipeline error."""
        self.logger.error(f"❌ {self.pipeline_name} failed: {message}")
        if exc:
            self.logger.exception(exc)

    def progress(self, current: int, total: int, message: str = "") -> None:
        """Log progress update."""
        pct = (current / total * 100) if total > 0 else 0
        msg = f"📊 Progress: {current}/{total} ({pct:.1f}%)"
        if message:
            msg += f" - {message}"
        self.logger.info(msg)

    def batch(self, batch_num: int, total_batches: int, records: int) -> None:
        """Log batch progress."""
        self.logger.info(
            f"   Batch {batch_num}/{total_batches} ({records} records)"
        )

    def info(self, message: str) -> None:
        """Log info message."""
        self.logger.info(message)

    def warning(self, message: str) -> None:
        """Log warning message."""
        self.logger.warning(message)

    def debug(self, message: str) -> None:
        """Log debug message."""
        self.logger.debug(message)
