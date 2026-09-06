"""Phase contract for the shipped v0.3.0 checkpoint. See docs/phase-contract.md."""

import math
import re
from numbers import Real


# Shipped checkpoint input order: never reorder.
PHASE_CATEGORIES = (
    "early phase 1", "phase 1", "phase 1/phase 2", "phase 2",
    "phase 2/phase 3", "phase 3", "phase 4", "nan",
)


class UnsupportedPhaseError(ValueError):
    """The supplied phase cannot be represented by the trained categories."""


def normalize_phase(value) -> str:
    """Accept registry arrays or historical strings; fail closed on unknowns.

    Empty/missing/not-applicable values use the trained missing category.
    Only the two combined phases present in training are supported. Array
    order and duplicate entries do not change the represented phase.
    """
    if value is None or (isinstance(value, Real) and math.isnan(value)):
        return "nan"
    if isinstance(value, (list, tuple)):
        if not value:
            return "nan"
        if any(not isinstance(item, str) or not item.strip() for item in value):
            raise UnsupportedPhaseError(f"Malformed trial phase: {value!r}")
        phases = {normalize_phase(item) for item in value}
        if len(phases) == 1:
            return phases.pop()
        if phases == {"phase 1", "phase 2"}:
            return "phase 1/phase 2"
        if phases == {"phase 2", "phase 3"}:
            return "phase 2/phase 3"
        raise UnsupportedPhaseError(f"Unsupported trial phase combination: {value!r}")
    if not isinstance(value, str):
        raise UnsupportedPhaseError(f"Malformed trial phase: {value!r}")

    key = re.sub(r"[\s_-]+", "", value).lower()
    if key in {"", "na", "n/a", "nan", "none", "notapplicable"}:
        return "nan"
    mapping = {re.sub(r"\s+", "", phase): phase for phase in PHASE_CATEGORIES}
    if key in mapping:
        return mapping[key]
    raise UnsupportedPhaseError(f"Unsupported trial phase: {value!r}")
