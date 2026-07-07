#!/usr/bin/env python3
"""Remote Supabase schema verification (Faz B).

Usage:
  cd ai-service
  .\\venv\\Scripts\\python.exe ..\\supabase\\scripts\\verify_schema_remote.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in ai-service/.env
Uses ai-service venv (supabase paketi orada yüklü).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    from supabase import create_client
except ModuleNotFoundError:
    print("ERROR: supabase paketi bulunamadı.")
    print("ai-service venv kullanın:")
    print("  .\\venv\\Scripts\\python.exe ..\\supabase\\scripts\\verify_schema_remote.py")
    sys.exit(1)

REQUIRED_TABLES = [
    "appointments",
    "orders",
    "staff_tasks",
    "decision_cycles",
    "campaigns",
    "content_items",
    "crm_activities",
    "ai_usage_counters",
    "business_members",
    "audit_logs",
    "business_api_keys",
]

PROFILE_COLUMNS = ["is_pro", "pro_activated_at", "role"]


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def load_env() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    load_env_file(repo_root / "ai-service" / ".env")


def main() -> int:
    load_env()
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        print("ERROR: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.")
        return 1

    client = create_client(url, key)
    failed: list[str] = []

    print("=== Tablo kontrolü ===")
    for table in REQUIRED_TABLES:
        try:
            client.table(table).select("*", count="exact").limit(0).execute()
            print(f"  OK  {table}")
        except Exception as error:
            print(f"  FAIL {table}: {error}")
            failed.append(table)

    print("\n=== profiles kolonları ===")
    try:
        response = (
            client.table("profiles")
            .select(",".join(PROFILE_COLUMNS))
            .limit(1)
            .execute()
        )
        if response.data is None:
            raise RuntimeError("profiles okunamadı")
        print("  OK  profiles (is_pro, pro_activated_at, role)")
    except Exception as error:
        print(f"  FAIL profiles: {error}")
        failed.append("profiles columns")

    print("\n=== schema_migrations (008) ===")
    try:
        response = (
            client.table("schema_migrations")
            .select("version,name")
            .order("version")
            .execute()
        )
        versions = [row["version"] for row in (response.data or [])]
        print(f"  OK  schema_migrations ({len(versions)} kayıt)")
        if versions:
            print(f"       son: {versions[-1]}")
    except Exception as error:
        print(f"  WARN schema_migrations: {error}")
        print("       008_schema_migrations.sql henüz uygulanmamış olabilir.")

    print("\n=== Özet ===")
    if failed:
        print(f"BAŞARISIZ ({len(failed)}): {', '.join(failed)}")
        print("Supabase SQL Editor'de eksik migration dosyalarını uygulayın.")
        return 1

    print("Tüm uzaktan tablo kontrolleri geçti.")
    print("RLS fonksiyonları için supabase/scripts/rls_audit.sql çalıştırın.")
    return 0


if __name__ == "__main__":
    sys.exit(main())