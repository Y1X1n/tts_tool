"""Build tts-studio.exe using PyInstaller."""
import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Ensure pyinstaller is installed
subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

# Build
subprocess.check_call([
    sys.executable, "-m", "PyInstaller",
    "--clean",
    "--noconfirm",
    "build.spec",
])

print("\nBuild complete! Output: dist/tts-studio.exe")
