#!/usr/bin/env python3
"""
High-Performance Local AST & Code Knowledge Graph Analyzer for Noor Platform
Extracts structural AST symbols, dependencies, imports/exports, Call Graphs,
and Zustand Store relationships into a local JSON knowledge graph & SQLite database.

Usage:
  python scripts/build_code_graph.py           # Builds docs/code_knowledge_graph.json & SQLite DB
  python scripts/build_code_graph.py --stats   # Displays summary metrics
  python scripts/build_code_graph.py --query SYMBOL
"""

import os
import re
import sys
import json
import sqlite3
from pathlib import Path
from typing import Dict, List, Set, Any, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT_DIR / "src"
DOCS_DIR = ROOT_DIR / "docs"
JSON_OUTPUT = DOCS_DIR / "code_knowledge_graph.json"
DB_OUTPUT = DOCS_DIR / "code_knowledge_graph.db"

class CodeGraphBuilder:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.src_dir = root_dir / "src"
        self.files: Dict[str, Dict[str, Any]] = {}
        self.symbols: Dict[str, Dict[str, Any]] = {}
        self.dependencies: List[Dict[str, str]] = []
        self.call_graph: List[Dict[str, str]] = []
        self.routes: List[Dict[str, Any]] = []

    def scan_files(self) -> List[Path]:
        valid_extensions = {".ts", ".tsx", ".js", ".jsx", ".mjs"}
        found_files = []
        for path in self.src_dir.rglob("*"):
            if path.is_file() and path.suffix in valid_extensions:
                found_files.append(path)
        return sorted(found_files)

    def parse_file(self, file_path: Path):
        rel_path = file_path.relative_to(self.root_dir).as_posix()
        try:
            content = file_path.read_text(encoding="utf-8", errors="replace")
        except Exception as err:
            print(f"Failed reading {rel_path}: {err}", file=sys.stderr)
            return

        lines = content.splitlines()
        loc = len(lines)
        size_bytes = len(content.encode("utf-8"))

        file_type = "module"
        if "src/app/" in rel_path and rel_path.endswith("page.tsx"):
            file_type = "app_route_page"
        elif "src/app/api/" in rel_path and rel_path.endswith("route.ts"):
            file_type = "api_route"
        elif "src/components/" in rel_path:
            file_type = "ui_component"
        elif "src/stores/" in rel_path:
            file_type = "zustand_store"
        elif "src/hooks/" in rel_path:
            file_type = "custom_hook"
        elif "src/lib/" in rel_path:
            file_type = "domain_engine"
        elif "src/data/" in rel_path:
            file_type = "static_catalog"

        imports = self._extract_imports(content, rel_path)
        exports = self._extract_exports(content, rel_path)
        functions = self._extract_functions(content, rel_path)
        stores_used = self._extract_store_usages(content)

        file_node = {
            "path": rel_path,
            "type": file_type,
            "loc": loc,
            "sizeBytes": size_bytes,
            "imports": imports,
            "exports": exports,
            "functions": functions,
            "storesUsed": stores_used,
            "isClientComponent": "'use client'" in content or ""use client"" in content,
        }

        self.files[rel_path] = file_node

        if file_type == "app_route_page":
            route_path = "/" + rel_path.replace("src/app/", "").replace("/page.tsx", "").replace("page.tsx", "")
            self.routes.append({
                "route": route_path if route_path != "/" else "/",
                "file": rel_path,
                "isClient": file_node["isClientComponent"]
            })

    def _extract_imports(self, content: str, current_file: str) -> List[Dict[str, Any]]:
        imports = []
        pattern = re.compile(r"imports+(?:types+)?(?:([w*s{},]+)s+froms+)?['"]([^'"]+)['"];?", re.MULTILINE)
        for match in pattern.finditer(content):
            imported_symbols_raw = match.group(1) or ""
            source = match.group(2)

            resolved_path = self._resolve_import_path(source, current_file)
            symbols = [s.strip() for s in re.split(r"[,{}s]+", imported_symbols_raw) if s.strip() and s.strip() != "type"]

            imports.append({
                "source": source,
                "resolvedPath": resolved_path,
                "symbols": symbols
            })

            if resolved_path:
                self.dependencies.append({
                    "from": current_file,
                    "to": resolved_path,
                    "symbols": ",".join(symbols)
                })

        return imports

    def _resolve_import_path(self, source: str, current_file: str) -> Optional[str]:
        if source.startswith("@/"):
            target = f"src/{source[2:]}"
        elif source.startswith("./") or source.startswith("../"):
            cur_dir = Path(current_file).parent
            target = (cur_dir / source).as_posix()
        else:
            return None

        for ext in [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"]:
            cand = target + ext
            if (self.root_dir / cand).is_file():
                return cand
        if (self.root_dir / target).is_file():
            return target
        return target

    def _extract_exports(self, content: str, rel_path: str) -> List[Dict[str, str]]:
        exports = []
        pattern = re.compile(r"exports+(?:asyncs+)?(function|const|let|var|class|interface|type|enum)s+([A-Za-z0-9_]+)", re.MULTILINE)
        for match in pattern.finditer(content):
            kind = match.group(1)
            name = match.group(2)
            exports.append({"kind": kind, "name": name})
            self.symbols[f"{rel_path}#{name}"] = {
                "name": name,
                "kind": kind,
                "file": rel_path
            }
        return exports

    def _extract_functions(self, content: str, rel_path: str) -> List[str]:
        funcs = []
        pattern = re.compile(r"(?:exports+)?(?:asyncs+)?functions+([A-Za-z0-9_]+)s*(", re.MULTILINE)
        for match in pattern.finditer(content):
            funcs.append(match.group(1))
        return funcs

    def _extract_store_usages(self, content: str) -> List[str]:
        stores = []
        pattern = re.compile(r"(use[A-Za-z0-9_]*Store)")
        for match in pattern.finditer(content):
            store = match.group(1)
            if store not in stores:
                stores.append(store)
        return stores

    def build(self) -> Dict[str, Any]:
        files = self.scan_files()
        print(f"Scanning {len(files)} source files in {self.src_dir}...")
        for f in files:
            self.parse_file(f)

        for rel_path, file_data in self.files.items():
            for store in file_data["storesUsed"]:
                self.call_graph.append({
                    "caller": rel_path,
                    "targetType": "zustand_store",
                    "target": store
                })

        graph = {
            "metadata": {
                "projectName": "Noor Platform (منصة نور)",
                "totalFiles": len(self.files),
                "totalSymbols": len(self.symbols),
                "totalDependencies": len(self.dependencies),
                "totalRoutes": len(self.routes),
                "generatedAt": "2026-08-21T15:50:00Z"
            },
            "routes": self.routes,
            "files": self.files,
            "symbols": self.symbols,
            "dependencies": self.dependencies,
            "callGraph": self.call_graph
        }

        DOCS_DIR.mkdir(parents=True, exist_ok=True)
        with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
            json.dump(graph, f, ensure_ascii=False, indent=2)
        print(f"Generated JSON Knowledge Graph: {JSON_OUTPUT}")

        self._export_to_sqlite(graph)
        return graph

    def _export_to_sqlite(self, graph: Dict[str, Any]):
        if DB_OUTPUT.exists():
            DB_OUTPUT.unlink()

        conn = sqlite3.connect(DB_OUTPUT)
        cur = conn.cursor()

        cur.execute("""
            CREATE TABLE files (
                path TEXT PRIMARY KEY,
                type TEXT,
                loc INTEGER,
                size_bytes INTEGER,
                is_client INTEGER,
                stores_used TEXT
            )
        """)

        cur.execute("""
            CREATE TABLE symbols (
                id TEXT PRIMARY KEY,
                name TEXT,
                kind TEXT,
                file TEXT
            )
        """)

        cur.execute("""
            CREATE TABLE dependencies (
                source_file TEXT,
                target_file TEXT,
                symbols TEXT
            )
        """)

        cur.execute("""
            CREATE TABLE routes (
                route TEXT PRIMARY KEY,
                file TEXT,
                is_client INTEGER
            )
        """)

        for path, file_info in graph["files"].items():
            cur.execute(
                "INSERT INTO files VALUES (?, ?, ?, ?, ?, ?)",
                (path, file_info["type"], file_info["loc"], file_info["sizeBytes"],
                 1 if file_info["isClientComponent"] else 0, ",".join(file_info["storesUsed"]))
            )

        for sym_id, sym_info in graph["symbols"].items():
            cur.execute(
                "INSERT INTO symbols VALUES (?, ?, ?, ?)",
                (sym_id, sym_info["name"], sym_info["kind"], sym_info["file"])
            )

        for dep in graph["dependencies"]:
            cur.execute(
                "INSERT INTO dependencies VALUES (?, ?, ?)",
                (dep["from"], dep["to"], dep.get("symbols", ""))
            )

        for r in graph["routes"]:
            cur.execute(
                "INSERT INTO routes VALUES (?, ?, ?)",
                (r["route"], r["file"], 1 if r["isClient"] else 0)
            )

        conn.commit()
        conn.close()
        print(f"Generated SQLite Knowledge Graph DB: {DB_OUTPUT}")

    def query(self, term: str):
        if not JSON_OUTPUT.exists():
            self.build()

        with open(JSON_OUTPUT, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"
=======================================================")
        print(f"Code Graph Query: {term}")
        print(f"=======================================================")

        matched_symbols = [v for k, v in data["symbols"].items() if term.lower() in v["name"].lower()]
        if matched_symbols:
            print(f"
Matched Symbols ({len(matched_symbols)}):")
            for s in matched_symbols[:15]:
                print(f"  [{s['kind']}] {s['name']} (in {s['file']})")

        matched_files = [k for k in data["files"].keys() if term.lower() in k.lower()]
        if matched_files:
            print(f"
Matched Files ({len(matched_files)}):")
            for fp in matched_files[:10]:
                fi = data["files"][fp]
                print(f"  {fp} ({fi['type']}, {fi['loc']} LOC, Stores: {fi['storesUsed']})")

        importers = [d["from"] for d in data["dependencies"] if term.lower() in d["to"].lower()]
        if importers:
            print(f"
Imported By ({len(importers)} files):")
            for imp in set(importers[:15]):
                print(f"  -> {imp}")

        print("=======================================================
")

def main():
    builder = CodeGraphBuilder(ROOT_DIR)
    if "--stats" in sys.argv:
        graph = builder.build()
        m = graph["metadata"]
        print("
Noor Platform Code Graph Metrics:")
        print(f"  Total Source Files: {m['totalFiles']}")
        print(f"  Total AST Symbols:  {m['totalSymbols']}")
        print(f"  Total Dependencies: {m['totalDependencies']}")
        print(f"  App Router Routes:  {m['totalRoutes']}")
    elif "--query" in sys.argv and len(sys.argv) > 2:
        query_term = sys.argv[sys.argv.index("--query") + 1]
        builder.query(query_term)
    else:
        builder.build()

if __name__ == "__main__":
    main()
