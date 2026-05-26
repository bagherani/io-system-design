terraform {
  required_version = ">= 1.6.0"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "docker" {}

locals {
  app_image_name = "io-system-design-nginx-demo-app:latest"
  cert_dir       = abspath("${path.module}/generated")
}

resource "docker_network" "demo" {
  name = "nginx-load-balancer-demo"
}

resource "docker_image" "app" {
  name         = local.app_image_name
  keep_locally = true
  triggers = {
    always_rebuild = timestamp()
  }

  build {
    context    = abspath("${path.module}/../..")
    dockerfile = "02-nginx/.Dockerfile"
  }
}

resource "docker_image" "nginx" {
  name         = "nginx:1.27-alpine"
  keep_locally = true
}

resource "tls_private_key" "nginx" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "nginx" {
  private_key_pem = tls_private_key.nginx.private_key_pem

  subject {
    common_name  = "localhost"
    organization = "IO System Design"
  }

  validity_period_hours = 24 * 30
  early_renewal_hours   = 24
  is_ca_certificate     = false

  allowed_uses = [
    "digital_signature",
    "key_encipherment",
    "server_auth",
  ]

  dns_names = ["localhost"]
  ip_addresses = [
    "127.0.0.1",
    "::1",
  ]
}

resource "local_file" "nginx_cert" {
  filename             = "${local.cert_dir}/nginx.crt.pem"
  content              = tls_self_signed_cert.nginx.cert_pem
  file_permission      = "0644"
  directory_permission = "0755"
}

resource "local_sensitive_file" "nginx_key" {
  filename             = "${local.cert_dir}/nginx.key.pem"
  content              = tls_private_key.nginx.private_key_pem
  file_permission      = "0600"
  directory_permission = "0755"
}

resource "docker_container" "app_one" {
  name    = "nginx-demo-app-1"
  image   = docker_image.app.image_id
  restart = "unless-stopped"

  env = [
    "PORT=3000",
    "SERVER_NAME=replica-one",
  ]

  networks_advanced {
    name = docker_network.demo.name
  }

  ports {
    internal = 3000
    external = var.replica_one_external_port
  }
}

resource "docker_container" "app_two" {
  name    = "nginx-demo-app-2"
  image   = docker_image.app.image_id
  restart = "unless-stopped"

  env = [
    "PORT=3000",
    "SERVER_NAME=replica-two",
  ]

  networks_advanced {
    name = docker_network.demo.name
  }

  ports {
    internal = 3000
    external = var.replica_two_external_port
  }
}

resource "docker_container" "nginx" {
  name    = "nginx-load-balancer"
  image   = docker_image.nginx.image_id
  restart = "unless-stopped"

  networks_advanced {
    name = docker_network.demo.name
  }

  ports {
    internal = 80
    external = var.nginx_external_port
  }

  ports {
    internal = 443
    external = var.nginx_https_external_port
  }

  volumes {
    host_path      = abspath("${path.module}/../nginx.conf")
    container_path = "/etc/nginx/nginx.conf"
    read_only      = true
  }

  volumes {
    host_path      = local.cert_dir
    container_path = "/etc/nginx/certs"
    read_only      = true
  }

  depends_on = [
    docker_container.app_one,
    docker_container.app_two,
    local_file.nginx_cert,
    local_sensitive_file.nginx_key,
  ]
}
