#!/bin/bash
set -euxo pipefail

# Run once on first boot. Prepare the instance to run Docker containers
# and to be usable for additional DevOps tooling (Jenkins agent, monitoring,
# curl-based testing, etc.).

# `dnf update` on AL2023 can pull in a full `curl` package that conflicts with
# the preinstalled `curl-minimal`. `--allowerasing` lets dnf replace the
# conflicting package instead of aborting the whole transaction.
dnf update -y --allowerasing

# Core tooling. Don't add plain `curl` — curl-minimal already provides the
# `curl` command on AL2023.
dnf install -y --allowerasing docker git jq tar gzip unzip

# Java 17 — makes this instance capable of hosting a Jenkins agent / SSH slave
# if you later want to extend the pipeline.
dnf install -y --allowerasing java-17-amazon-corretto

systemctl enable --now docker

# Let ec2-user run `docker` without sudo (Jenkins SSHes in as ec2-user).
usermod -aG docker ec2-user

# 2 GB swap file — cheap insurance against OOM kills when the box is
# running the app container plus any ad-hoc workloads.
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# Marker file Jenkins can check to confirm bootstrap is done.
echo "docker-ready" > /var/log/foodexpress-bootstrap.log
