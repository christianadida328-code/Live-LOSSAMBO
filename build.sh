#!/usr/bin/env bash
set -euo pipefail

npm --prefix frontend ci
npm --prefix frontend run build
