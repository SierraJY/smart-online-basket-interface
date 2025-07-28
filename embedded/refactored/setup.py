#!/usr/bin/env python3
"""
Setup script for rfid_system package
"""

from setuptools import setup, find_packages

setup(
    name="rfid_system",
    version="0.1.0",
    description="RFID Reader System for YRM100 devices",
    author="Your Name",
    author_email="your.email@example.com",
    packages=find_packages(),
    install_requires=[
        "pyserial>=3.4",
    ],
    python_requires=">=3.7",
    entry_points={
        "console_scripts": [
            "rfid-system=rfid_system.main:run_rfid_system",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
) 