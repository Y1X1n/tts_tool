import os
import sys


def base_dir() -> str:
    """Return the project root directory. Works both as script and PyInstaller exe."""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def data_dir() -> str:
    return os.path.join(base_dir(), "data")


def static_dir() -> str:
    if getattr(sys, 'frozen', False):
        return os.path.join(sys._MEIPASS, "static")
    return os.path.join(base_dir(), "static")
