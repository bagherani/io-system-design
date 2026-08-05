#!/bin/sh
set -eu

SERVER1_IP="${SERVER1_IP:-172.29.0.11}"
SERVER2_IP="${SERVER2_IP:-172.29.0.12}"
PRIVATE_SUBNET="${PRIVATE_SUBNET:-172.29.0.0/24}"

# Wait until the backend IPs are reachable from the NAT container.
until ping -c1 "$SERVER1_IP" >/dev/null 2>&1; do sleep 1; done
until ping -c1 "$SERVER2_IP" >/dev/null 2>&1; do sleep 1; done

# Clean any inherited rules to keep repeated workshops deterministic.
iptables -t nat -F
iptables -F
iptables -P FORWARD DROP

# Keep already-established flows alive.
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Inbound path: NAT port 81 always points to server 1 for deterministic internet-check demos.
iptables -t nat -A PREROUTING -p tcp --dport 81 -j DNAT --to-destination "$SERVER1_IP":3000

# Inbound path: NAT port 82 always points to server 2.
iptables -t nat -A PREROUTING -p tcp --dport 82 -j DNAT --to-destination "$SERVER2_IP":3000

# SNAT ingress-to-backend traffic so responses always return through this NAT host.
iptables -t nat -A POSTROUTING -d "$PRIVATE_SUBNET" -j MASQUERADE

# Allow ingress forwarding from public interface to private backends.
iptables -A FORWARD -p tcp -d "$SERVER1_IP" --dport 3000 -j ACCEPT
iptables -A FORWARD -p tcp -d "$SERVER2_IP" --dport 3000 -j ACCEPT

# Keep a broad outbound rule so private workloads can reach the internet if routed through this host.
iptables -t nat -A POSTROUTING -s "$PRIVATE_SUBNET" -o eth0 -j MASQUERADE
iptables -A FORWARD -i eth1 -o eth0 -s "$PRIVATE_SUBNET" -j ACCEPT

echo "NAT rules loaded."
iptables -t nat -S
iptables -S

# Keep the container running.
tail -f /dev/null
