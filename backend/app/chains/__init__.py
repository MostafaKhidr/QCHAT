"""
LangChain chains for NLP processing.
"""
from .intent_chain import create_intent_chain
from .clarification_chain import create_clarification_chain
from .qchat_answer_extraction_chain import create_qchat_answer_extraction_chain
from .qchat_welcome_chain import create_qchat_welcome_chain
from .redirect_chain import create_redirect_chain

# Optional imports - only import if files exist
try:
    from .restart_chain import create_restart_chain
except ImportError:
    create_restart_chain = None

try:
    from .exit_chain import create_exit_chain
except ImportError:
    create_exit_chain = None

try:
    from .start_intent_chain import create_start_intent_chain
except ImportError:
    create_start_intent_chain = None

try:
    from .welcome_chain import create_welcome_chain
except ImportError:
    create_welcome_chain = None

__all__ = [
    "create_intent_chain",
    "create_clarification_chain",
    "create_qchat_answer_extraction_chain",
    "create_qchat_welcome_chain",
    "create_redirect_chain",
]

# Add optional exports if they exist
if create_restart_chain:
    __all__.append("create_restart_chain")
if create_exit_chain:
    __all__.append("create_exit_chain")
if create_start_intent_chain:
    __all__.append("create_start_intent_chain")
if create_welcome_chain:
    __all__.append("create_welcome_chain")

