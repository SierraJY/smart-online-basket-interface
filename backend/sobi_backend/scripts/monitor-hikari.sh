#!/bin/bash
while true; do
  echo "$(date '+%H:%M:%S')"
  curl -s http://localhost:8080/api/admin/hikari-status
  echo -e "\n---"
  sleep 1
done