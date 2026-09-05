# -*- coding: utf-8 -*-
"""
Forwarding compatibility facade for architecture audit PDF report generator.
Delegates execution to tools/audit/generate_audit_pdf.py
"""
import os
import sys
import subprocess

if __name__ == '__main__':
    target = os.path.join(os.path.dirname(__file__), '..', 'tools', 'audit', 'generate_audit_pdf.py')
    cmd = [sys.executable, os.path.abspath(target)] + sys.argv[1:]
    sys.exit(subprocess.call(cmd))
