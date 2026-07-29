# Extracted alpha sheets

Transparent RGBA sheets produced from the accepted chroma sources with the
installed ImageGen `remove_chroma_key.py` helper using border auto-key,
soft-matte, despill, threshold 12, and opaque threshold 220.

The deterministic builder crops these sheets into six independent variants per
resource; runtime never loads the full sheets.
