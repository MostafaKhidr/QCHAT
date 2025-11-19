"""
Logging utility for M-CHAT application.

Sets up structured logging with:
- File handler: All logs (DEBUG level) written to mchat.log
- Console handler: Only WARNING and above (user/bot messages handled separately)
"""
import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict

# Get project root directory
_project_root = Path(__file__).parent.parent.resolve()  # Project root

# Logs directory
LOGS_DIR = _project_root / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Current session name (set dynamically)
_current_session_name: Optional[str] = None


def set_session_name(session_name: str):
    """
    Set the current session name for log file naming.
    
    This should be called after collecting session information (parent name, child name)
    but before creating workflow loggers. All loggers created after this call will
    write to a session-specific log file: logs/mchat_{session_name}.log
    
    Args:
        session_name: Session identifier (e.g., "parent_child_timestamp")
    
    Note:
        Closes and removes file handlers from ALL existing loggers (both cached and Python's logging system),
        then clears the cache. This ensures all loggers created after this call will use the new
        session-specific log file. Existing loggers will get new handlers when they're next retrieved.
    """
    global _current_session_name, _logger_instances
    
    # Close and remove file handlers from cached loggers
    for logger in _logger_instances.values():
        for handler in logger.handlers[:]:  # Copy list to avoid modification during iteration
            if isinstance(handler, logging.FileHandler):
                try:
                    handler.close()
                except:
                    pass
                logger.removeHandler(handler)
    
    # Also close file handlers from ALL loggers in Python's logging system
    # This handles loggers created at module level in all files
    for logger_name in list(logging.Logger.manager.loggerDict.keys()):
        logger_obj = logging.getLogger(logger_name)
        for handler in logger_obj.handlers[:]:
            if isinstance(handler, logging.FileHandler):
                try:
                    handler.close()
                except:
                    pass
                logger_obj.removeHandler(handler)
    
    # Set new session name
    _current_session_name = session_name
    
    # Clear logger cache so all loggers get recreated with new handlers
    _logger_instances.clear()


def get_session_log_file() -> Path:
    """
    Get the log file path for the current session.
    
    Returns:
        Path to the session-specific log file
    """
    if _current_session_name:
        # Sanitize session name for filename (remove invalid characters)
        safe_name = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in _current_session_name)
        return LOGS_DIR / f"mchat_{safe_name}.log"
    else:
        # Default log file if no session is set
        return LOGS_DIR / "mchat.log"


def setup_logger(name: str = "mchat", log_level: str = "DEBUG") -> logging.Logger:
    """
    Set up and configure logger for the application.
    
    This function ALWAYS ensures the logger has the correct handlers for the current session.
    It updates the logger instance directly, so even module-level logger variables will work.
    
    Args:
        name: Logger name (module name)
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        
    Returns:
        Configured logger instance with correct handlers
    """
    logger = logging.getLogger(name)
    
    # Always check and update file handlers if session is set
    # This ensures loggers get updated handlers even if they were created before session was set
    if _current_session_name:
        current_log_file = get_session_log_file()
        # Check if logger already has a file handler pointing to the correct session file
        file_handlers = [h for h in logger.handlers if isinstance(h, logging.FileHandler)]
        has_correct_handler = any(
            hasattr(h, 'baseFilename') and 
            str(h.baseFilename) == str(current_log_file) and
            hasattr(h, 'stream') and 
            h.stream and 
            not h.stream.closed
            for h in file_handlers
        )
        
        if not has_correct_handler:
            # Remove ALL file handlers (they point to wrong file or are closed)
            # This updates the logger instance directly, so module-level variables will work
            for handler in logger.handlers[:]:
                if isinstance(handler, logging.FileHandler):
                    try:
                        handler.close()
                    except:
                        pass
                    logger.removeHandler(handler)
    else:
        # No session set - check if handlers are valid
        valid_handlers = [h for h in logger.handlers 
                         if not (isinstance(h, logging.FileHandler) and 
                                hasattr(h, 'stream') and 
                                (h.stream is None or h.stream.closed))]
        if valid_handlers:
            return logger  # Already has valid handlers
    
    # Set level before adding handlers
    logger.setLevel(getattr(logging, log_level.upper(), logging.DEBUG))
    
    # Remove ALL handlers (including console) to ensure clean setup
    # We'll re-add them below
    for handler in logger.handlers[:]:
        try:
            handler.close()
        except:
            pass
        logger.removeHandler(handler)
    
    # Create formatters
    # Detailed formatter for file (includes timestamp, level, module, line number)
    file_formatter = logging.Formatter(
        fmt='%(asctime)s | %(levelname)-8s | %(name)s | %(filename)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Simple formatter for console (only errors/warnings)
    console_formatter = logging.Formatter(
        fmt='%(levelname)-8s | %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # File handler - captures ALL logs (DEBUG and above)
    # Use mode='a' to append, and create a custom handler that flushes immediately
    class FlushingFileHandler(logging.FileHandler):
        """File handler that flushes after each write."""
        def emit(self, record):
            super().emit(record)
            self.flush()
            if hasattr(self.stream, 'flush'):
                self.stream.flush()
    
    # Get session-specific log file
    log_file = get_session_log_file()
    file_handler = FlushingFileHandler(log_file, mode='a', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    # Console handler - respect config log_level, but default to WARNING
    # This prevents debug/info from cluttering the console unless explicitly enabled
    console_handler = logging.StreamHandler(sys.stderr)
    try:
        from app.config import settings
        if hasattr(settings, 'log_level'):
            console_level = getattr(logging, settings.log_level.upper(), logging.WARNING)
        else:
            console_level = logging.WARNING
    except Exception:
        console_level = logging.WARNING
    console_handler.setLevel(console_level)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger


# Cache of logger instances by name
_logger_instances: Dict[str, logging.Logger] = {}


def get_logger(name: str = "mchat") -> logging.Logger:
    """
    Get or create logger instance for a specific module.
    
    Each module should call get_logger(__name__) to get its own logger.
    If a session name is set, the logger will automatically get handlers
    pointing to the session-specific log file.
    
    This function ALWAYS ensures the logger has the correct handlers for the current session.
    Even if a logger was created before the session was set, it will be updated when retrieved.
    
    Args:
        name: Logger name (typically __name__ of the calling module)
        
    Returns:
        Configured logger instance for that module with correct handlers
    """
    global _logger_instances
    
    # Get logger from Python's logging system
    # CRITICAL: This is the SAME instance that module-level variables reference
    # When we update handlers on this instance, all references see the update
    logger = logging.getLogger(name)
    
    # ALWAYS ensure the logger has correct handlers for current session
    # This is the key: we update the logger instance directly, so module-level variables work
    if _current_session_name:
        current_log_file = get_session_log_file()
        # Check if logger has a valid file handler pointing to current session file
        file_handlers = [h for h in logger.handlers if isinstance(h, logging.FileHandler)]
        has_correct_handler = any(
            hasattr(h, 'baseFilename') and 
            str(h.baseFilename) == str(current_log_file) and
            hasattr(h, 'stream') and 
            h.stream and 
            not h.stream.closed
            for h in file_handlers
        )
        
        if not has_correct_handler:
            # Remove from cache and force setup_logger to update handlers
            if name in _logger_instances:
                del _logger_instances[name]
            # setup_logger updates the logger instance directly
            # Since module-level variables reference the same instance, they'll see the update
            logger = setup_logger(name, "DEBUG")
            _logger_instances[name] = logger
            return logger
    else:
        # No session set - check if handlers are valid
        valid_handlers = [h for h in logger.handlers 
                         if not (isinstance(h, logging.FileHandler) and 
                                hasattr(h, 'stream') and 
                                (h.stream is None or h.stream.closed))]
        if valid_handlers:
            # Cache it if not already cached
            if name not in _logger_instances:
                _logger_instances[name] = logger
            return logger
    
    # Check cache first
    if name in _logger_instances:
        cached_logger = _logger_instances[name]
        if _current_session_name:
            file_handlers = [h for h in cached_logger.handlers if isinstance(h, logging.FileHandler)]
            has_valid_handler = any(
                hasattr(h, 'baseFilename') and 
                str(h.baseFilename) == str(get_session_log_file()) and
                hasattr(h, 'stream') and 
                h.stream and 
                not h.stream.closed
                for h in file_handlers
            )
            if has_valid_handler:
                return cached_logger
        elif cached_logger.handlers:
            return cached_logger
        # Cache has invalid logger, remove it
        del _logger_instances[name]
    
    # Get log level from config
    try:
        from app.config import settings
        log_level = "DEBUG"
    except Exception:
        log_level = "DEBUG"
    
    # Setup logger - this updates the logger instance directly
    # All module-level variables pointing to this logger will see the update
    logger = setup_logger(name, log_level)
    _logger_instances[name] = logger
    
    return logger

