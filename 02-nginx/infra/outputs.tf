output "load_balancer_url" {
  description = "HTTP Nginx entrypoint that load-balances across both Node.js replicas."
  value       = "http://localhost:${var.nginx_external_port}"
}

output "load_balancer_https_url" {
  description = "HTTPS Nginx entrypoint with HTTP/2 enabled and a local self-signed certificate."
  value       = "https://localhost:${var.nginx_https_external_port}"
}

output "replica_one_url" {
  description = "Direct URL for the first app replica."
  value       = "http://localhost:${var.replica_one_external_port}"
}

output "replica_two_url" {
  description = "Direct URL for the second app replica."
  value       = "http://localhost:${var.replica_two_external_port}"
}
