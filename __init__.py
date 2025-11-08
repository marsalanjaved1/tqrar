"""TQRAR - AI Assistant for JupyterLab"""

try:
    from ._version import __version__
except ImportError:
    import warnings
    warnings.warn("Importing 'tqrar' outside a proper installation.")
    __version__ = "dev"


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "tqrar"
    }]
