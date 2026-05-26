terraform {
  required_version = ">= 1.6.0"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

locals {
  app_image_name = "io-system-design-nginx-demo-app:latest"
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

  volumes {
    host_path      = abspath("${path.module}/../nginx.conf")
    container_path = "/etc/nginx/nginx.conf"
    read_only      = true
  }

  depends_on = [
    docker_container.app_one,
    docker_container.app_two,
  ]
}
