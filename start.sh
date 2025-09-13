#!/bin/bash

echo "Starting qobuz-music-ingestion application..."

echo "Current directory: $PWD"

cd /volume1/homes/maven_admin/qobuz-music-ingestion && npm run build && npm run start > "temp/logs/$(date '+%Y-%m-%d_%H:%M:%S').log"
