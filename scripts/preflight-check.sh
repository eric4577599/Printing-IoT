#!/usr/bin/env bash
#
# preflight-check.sh —— 上線前置檢查(唯讀)
#
# 輸入:無參數。從專案根的 .env 讀設定,對執行中的 postgres 容器下查詢。
# 輸出:逐項檢查結果;有阻斷項時列出處置方式並以 exit 1 結束。
# 邏輯:這支腳本**只讀不寫**,不建立、不修改、不刪除任何東西,也不啟動或重建任何容器。
#       它要回答的唯一問題是「現在可不可以把新版 API 拉起來」。
#
# 為什麼要有它:backend-api 啟動時會自動套用 EF migration
# (Program.cs → MigrateWithRetryAsync)。也就是說「套 migration」不是一個
# 由人決定時機的獨立步驟,而是「新版 API 一啟動就發生」。
# 因此所有 DBA 前置條件必須在**拉起新版容器之前**查完,
# 而不是照 docs/report20260905-2.md §2 的字面順序在重啟之後才查。
#
# 用法:
#   cd "<專案根>" && ./scripts/preflight-check.sh
#
# 詳見 docs/report20260906-2.md

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'

BLOCKERS=()
WARNINGS=()

pass()  { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn()  { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$1"; WARNINGS+=("$1"); }
block() { printf '  %s✗%s %s\n' "$RED" "$RESET" "$1"; BLOCKERS+=("$1"); }
head2() { printf '\n%s%s%s\n' "$BOLD" "$1" "$RESET"; }

printf '%s上線前置檢查(唯讀)%s  —— %s\n' "$BOLD" "$RESET" "$(date '+%Y-%m-%d %H:%M')"
printf '專案根:%s\n' "$REPO_ROOT"

# ── 1. 環境設定 ────────────────────────────────────────────────
head2 "1. 環境設定(.env)"

# 從 .env 取一個鍵的值。
# 輸入:鍵名。輸出:值(去掉外層單/雙引號);找不到就輸出空字串。
# 刻意不用 `source` —— 一來 bash 3.2 的 `source <(...)` 會拿到空的 fd,
# 二來 source 等同執行 .env 的內容,一份設定檔不該有這種權力。
env_get() {
  [[ -f .env ]] || return 0
  local v
  v="$(grep -E "^[[:space:]]*$1=" .env | tail -1)" || return 0
  v="${v#*=}"
  v="${v%$'\r'}"                       # 容忍 CRLF
  case "$v" in
    \"*\") v="${v#\"}"; v="${v%\"}" ;;
    \'*\') v="${v#\'}"; v="${v%\'}" ;;
  esac
  printf '%s' "$v"
}

if [[ ! -f .env ]]; then
  block ".env 不存在 —— 先 cp .env.example .env 並填值"
else
  pass ".env 存在"

  JWT_SECRET="$(env_get JWT_SECRET)"
  AUTH_SETUP_TOKEN="$(env_get AUTH_SETUP_TOKEN)"
  POSTGRES_USER="$(env_get POSTGRES_USER)"
  POSTGRES_PASSWORD="$(env_get POSTGRES_PASSWORD)"
  POSTGRES_DB="$(env_get POSTGRES_DB)"

  jwt="${JWT_SECRET:-}"
  if [[ -z "$jwt" ]]; then
    block "JWT_SECRET 未設定 —— API 啟動即擲例外"
  elif [[ "$jwt" == "ChangeMeToAStrongRandomSecretAtLeast32Chars" ]]; then
    block "JWT_SECRET still 是 .env.example 的佔位字串 —— 必須換成隨機值(openssl rand -base64 48)"
  elif (( ${#jwt} < 32 )); then
    block "JWT_SECRET 只有 ${#jwt} 字元,少於 32 —— HS256 簽章金鑰長度不足,API 啟動即擲例外"
  else
    pass "JWT_SECRET 已設定(${#jwt} 字元)"
    warn "JWT_SECRET 是否為「這次上線才產生的新值」腳本無從判斷 —— 舊密鑰已在版控歷史中外洩(R4),請自行確認已輪替"
  fi

  if [[ -n "${AUTH_SETUP_TOKEN:-}" ]]; then
    warn "AUTH_SETUP_TOKEN 目前有值 —— 這代表 /api/v1/auth/setup-admin 是開著的。建完第一個 ADMIN 後要清空並重啟"
  else
    pass "AUTH_SETUP_TOKEN 為空(setup-admin 關閉,回 404)"
  fi

  if [[ -z "${POSTGRES_PASSWORD:-}" || "${POSTGRES_PASSWORD:-}" == "your_secure_password_here" ]]; then
    block "POSTGRES_PASSWORD 未設定或仍是佔位字串"
  else
    pass "POSTGRES_PASSWORD 已設定"
  fi
fi

# ── 2. 資料庫連線 ──────────────────────────────────────────────
head2 "2. 資料庫連線"

DB_OK=0
PG_SERVICE="postgres"
PG_USER="${POSTGRES_USER:-postgres}"
PG_DB="${POSTGRES_DB:-FlexoDB}"

# 回傳單一純量值;失敗時回傳空字串
psql_scalar() {
  docker compose exec -T "$PG_SERVICE" \
    psql -U "$PG_USER" -d "$PG_DB" -tAc "$1" 2>/dev/null
}

if ! command -v docker >/dev/null 2>&1; then
  block "找不到 docker 指令 —— 這台機器跑不了檢查,請改在部署主機上執行"
elif ! docker info >/dev/null 2>&1; then
  # 與「容器沒起來」分開報,兩者處置方式完全不同
  block "docker daemon 連不上(daemon 沒開,或這個使用者沒有 socket 權限)—— 這台機器跑不了檢查,請改在部署主機上執行"
elif ! docker compose ps --status running --services 2>/dev/null | grep -qx "$PG_SERVICE"; then
  block "postgres 容器沒有在執行 —— 先 docker compose up -d postgres 再跑本檢查(只起資料庫,不會動到 API)"
else
  probe="$(psql_scalar 'SELECT 1')"
  if [[ "$probe" == "1" ]]; then
    pass "已連上 $PG_DB(使用者 $PG_USER)"
    DB_OK=1
  else
    block "postgres 容器在跑,但連不進 $PG_DB —— 檢查 POSTGRES_USER / POSTGRES_DB / POSTGRES_PASSWORD"
  fi
fi

# ── 3. Migration 落差 ──────────────────────────────────────────
head2 "3. Migration 落差"

PENDING=()
if (( DB_OK )); then
  # repo 裡所有 migration 的 Id(檔名去掉 .cs),排序後即為套用順序。
  # 用 while read 而不是 mapfile —— mapfile 要 bash 4+,macOS 內建的是 3.2。
  ALL_MIGRATIONS=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && ALL_MIGRATIONS+=("$line")
  done < <(
    find backend/PrintingIoT.Infrastructure/Migrations -name '*.cs' \
      ! -name '*.Designer.cs' ! -name '*ModelSnapshot.cs' -exec basename {} .cs \; | sort
  )

  APPLIED=()
  hist="$(psql_scalar "SELECT to_regclass('public.\"__EFMigrationsHistory\"') IS NOT NULL")"
  if [[ "$hist" == "t" ]]; then
    while IFS= read -r line; do
      [[ -n "$line" ]] && APPLIED+=("$line")
    done < <(psql_scalar 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY 1')
    pass "__EFMigrationsHistory 存在,已套用 ${#APPLIED[@]} 個"
  else
    warn "__EFMigrationsHistory 不存在 —— 這是一個全新的空資料庫,全部 migration 都會在 API 首次啟動時套用"
  fi

  for m in "${ALL_MIGRATIONS[@]}"; do
    found=0
    if (( ${#APPLIED[@]} > 0 )); then
      for a in "${APPLIED[@]}"; do [[ "$a" == "$m" ]] && { found=1; break; }; done
    fi
    (( found )) || PENDING+=("$m")
  done

  if (( ${#PENDING[@]} == 0 )); then
    pass "沒有待套用的 migration —— 資料庫結構已與這份程式碼一致"
  else
    printf '  %s!%s 待套用 %d 個(API 一啟動就會自動套用):\n' "$YELLOW" "$RESET" "${#PENDING[@]}"
    for m in "${PENDING[@]}"; do printf '      %s\n' "$m"; done
    WARNINGS+=("有 ${#PENDING[@]} 個 migration 待套用,套用前務必已備份資料庫")
  fi
else
  warn "資料庫連不上,略過 migration 落差檢查"
fi

# 某個 migration 是否待套用
is_pending() {
  (( ${#PENDING[@]} == 0 )) && return 1
  for m in "${PENDING[@]}"; do [[ "$m" == *"$1"* ]] && return 0; done
  return 1
}

# ── 4. DBA 前置條件 ────────────────────────────────────────────
head2 "4. DBA 前置條件(唯一會讓部署整段卡住的東西)"

if (( DB_OK )); then

  # 4.1 重複帳號 —— AddUsernameNormalizedUniqueIndex 的前置條件
  if is_pending "AddUsernameNormalizedUniqueIndex"; then
    if [[ "$(psql_scalar "SELECT to_regclass('public.\"Users\"') IS NOT NULL")" != "t" ]]; then
      pass "Users 表尚不存在 —— 不可能有重複帳號"
    else
      dup_users="$(psql_scalar 'SELECT COUNT(*) FROM (SELECT UPPER(TRIM("Username")) FROM "Users" GROUP BY 1 HAVING COUNT(*) > 1) t')"
      if [[ "$dup_users" == "0" ]]; then
        pass "無僅大小寫不同的重複帳號(AddUsernameNormalizedUniqueIndex 可安全套用)"
      elif [[ -z "$dup_users" ]]; then
        block "重複帳號檢查查詢失敗 —— 未確認前不可拉起新版 API"
      else
        block "有 $dup_users 組僅大小寫不同的重複帳號 —— 唯一索引會建失敗、整個 migration 回滾,API 會啟動失敗"
        printf '      明細:\n'
        docker compose exec -T "$PG_SERVICE" psql -U "$PG_USER" -d "$PG_DB" \
          -c 'SELECT UPPER(TRIM("Username")) AS normalized, COUNT(*), STRING_AGG("Username", '"'"', '"'"') AS variants
              FROM "Users" GROUP BY 1 HAVING COUNT(*) > 1 ORDER BY 1;' 2>/dev/null | sed 's/^/      /'
        printf '      處置:由 DBA 先合併或改名,再重跑本檢查。migration 刻意不自動合併 —— 自動挑一筆刪除會靜默毀掉某個人的帳號。\n'
      fi
      # 非 ASCII 帳號會讓 PostgreSQL 的 UPPER() 與 C# 的 ToUpperInvariant() 對不起來,
      # 上面那段 SQL 的等價性只在 ASCII 帳號上成立
      non_ascii="$(psql_scalar 'SELECT COUNT(*) FROM "Users" WHERE "Username" !~ '"'"'^[[:ascii:]]+$'"'"'')"
      if [[ -n "$non_ascii" && "$non_ascii" != "0" ]]; then
        block "有 $non_ascii 個非 ASCII 帳號 —— 上面那段檢查 SQL 對它們不成立(PostgreSQL UPPER() 與 C# ToUpperInvariant() 的大小寫對映不同),必須人工逐一確認"
      fi
    fi
  else
    pass "AddUsernameNormalizedUniqueIndex 已套用,前置條件不再適用"
  fi

  # 4.2 重複 ProductCode —— AddProductCodeUniqueIndex 的前置條件
  if is_pending "AddProductCodeUniqueIndex"; then
    if [[ "$(psql_scalar "SELECT to_regclass('public.\"Products\"') IS NOT NULL")" != "t" ]]; then
      pass "Products 表尚不存在 —— 不可能有重複 ProductCode"
    else
      # NULL 不受唯一索引拘束(PostgreSQL 允許多個 NULL),故排除
      dup_prod="$(psql_scalar 'SELECT COUNT(*) FROM (SELECT "ProductCode" FROM "Products" WHERE "ProductCode" IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1) t')"
      if [[ "$dup_prod" == "0" ]]; then
        pass "無重複 ProductCode(AddProductCodeUniqueIndex 可安全套用)"
      elif [[ -z "$dup_prod" ]]; then
        block "重複 ProductCode 檢查查詢失敗 —— 未確認前不可拉起新版 API"
      else
        block "有 $dup_prod 組重複 ProductCode —— 唯一索引會建失敗,API 會啟動失敗"
        docker compose exec -T "$PG_SERVICE" psql -U "$PG_USER" -d "$PG_DB" \
          -c 'SELECT "ProductCode", COUNT(*) FROM "Products" WHERE "ProductCode" IS NOT NULL
              GROUP BY 1 HAVING COUNT(*) > 1 ORDER BY 2 DESC;' 2>/dev/null | sed 's/^/      /'
      fi
    fi
  else
    pass "AddProductCodeUniqueIndex 已套用,前置條件不再適用"
  fi

else
  warn "資料庫連不上,略過 DBA 前置條件檢查 —— 這兩項沒查過就不可以拉起新版 API"
fi

# ── 5. 帳號現況(決定要不要走 setup-admin) ─────────────────────
head2 "5. 帳號現況"

if (( DB_OK )) && [[ "$(psql_scalar "SELECT to_regclass('public.\"Users\"') IS NOT NULL")" == "t" ]]; then
  n_users="$(psql_scalar 'SELECT COUNT(*) FROM "Users"')"
  n_active="$(psql_scalar 'SELECT COUNT(*) FROM "Users" WHERE "IsActive"')"
  if [[ "${n_users:-0}" == "0" ]]; then
    warn "Users 表是空的 —— 必須走 setup-admin 建立第一個 ADMIN,在那之前現場完全無法操作系統"
  else
    pass "Users 共 $n_users 筆(啟用中 ${n_active:-?} 筆)"
    docker compose exec -T "$PG_SERVICE" psql -U "$PG_USER" -d "$PG_DB" \
      -c 'SELECT "Username", "IsActive" FROM "Users" ORDER BY "Username";' 2>/dev/null | sed 's/^/      /'
  fi
else
  warn "Users 表不存在或資料庫連不上 —— 視同全新部署,需走 setup-admin"
fi

# ── 收尾 ───────────────────────────────────────────────────────
head2 "結論"

if (( ${#BLOCKERS[@]} > 0 )); then
  printf '  %s%d 項阻斷,不可拉起新版 API:%s\n' "$RED" "${#BLOCKERS[@]}" "$RESET"
  for b in "${BLOCKERS[@]}"; do printf '    - %s\n' "$b"; done
  printf '\n  處理完後重跑本腳本。\n'
  exit 1
fi

printf '  %s前置條件全數通過。%s\n' "$GREEN" "$RESET"
if (( ${#WARNINGS[@]} > 0 )); then
  printf '  以下 %d 項需要你自己確認(腳本判斷不了):\n' "${#WARNINGS[@]}"
  for w in "${WARNINGS[@]}"; do printf '    - %s\n' "$w"; done
fi
printf '\n  下一步:docs/report20260906-2.md §2 的 B 段(拉起新版容器)。\n'
exit 0
