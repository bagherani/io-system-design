variable "nginx_external_port" {
  description = "Host port for the Nginx load balancer."
  type        = number
  default     = 8088
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
