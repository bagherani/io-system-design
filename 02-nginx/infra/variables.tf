variable "nginx_external_port" {
  description = "Host HTTP port for the Nginx load balancer."
  type        = number
  default     = 8088
}

variable "nginx_https_external_port" {
  description = "Host HTTPS port for the Nginx load balancer with HTTP/2 enabled."
  type        = number
  default     = 8443
}

variable "replica_one_external_port" {
  description = "Host port for direct access to the first app replica."
  type        = number
  default     = 4101
}

variable "replica_two_external_port" {
  description = "Host port for direct access to the second app replica."
  type        = number
  default     = 4102
}
